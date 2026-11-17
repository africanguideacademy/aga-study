// ============================================================
// AFRICAN GUIDE ACADEMY - Study App progress submissions
// Receives "Submit progress" posts from the study app
// (https://africanguideacademy.github.io/aga-study/) and records them in
// the "AGA Study App - Student Progress" spreadsheet:
//   Submissions - one row per submission (full history)
//   Students    - one row per student (latest totals), matched to the
//                 AGA Student Profiles registry by Omang / Passport.
// Setup: run setup() once from the editor (authorises + creates the sheet).
// ============================================================

const REGISTRY_ID = '1nrPZ0Ra0-xj8wcqMvkTlC__tO1otZJKf0g-m2v4yWyc'; // AGA Student Profiles registry
const REGISTRY_SHEET = 'Students';
const REG = { StudentID: 0, Surname: 1, FirstNames: 2, OmangPassport: 6 };

const SUB_HEAD = ['Submitted', 'Surname', 'First names', 'Omang / Passport', 'Student ID (registry)', 'Session answers', 'Session correct',
  'Session accuracy', 'Total answers', 'Total accuracy', 'Practised', 'Mastered', 'Last studied', 'Per list', 'Device', 'App version'];
const STU_HEAD = ['Omang / Passport', 'Surname', 'First names', 'Student ID (registry)', 'First submission', 'Last submission', 'Submissions',
  'Total answers', 'Total accuracy', 'Practised', 'Mastered', 'Last studied', 'Per list (latest)'];

function setup() {
  const ss = getBook_();
  Logger.log('Progress sheet: ' + ss.getUrl());
  try { SpreadsheetApp.openById(REGISTRY_ID).getSheetByName(REGISTRY_SHEET).getLastRow(); Logger.log('Registry readable.'); }
  catch (e) { Logger.log('Registry NOT readable: ' + e); }
}

function getBook_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('PROGRESS_SHEET_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) { /* recreate below */ } }
  const ss = SpreadsheetApp.create('AGA Study App - Student Progress');
  props.setProperty('PROGRESS_SHEET_ID', ss.getId());
  const sub = ss.getSheets()[0];
  sub.setName('Submissions');
  sub.getRange(1, 1, 1, SUB_HEAD.length).setValues([SUB_HEAD]).setFontWeight('bold').setBackground('#fbecd2');
  sub.setFrozenRows(1);
  const st = ss.insertSheet('Students');
  st.getRange(1, 1, 1, STU_HEAD.length).setValues([STU_HEAD]).setFontWeight('bold').setBackground('#fbecd2');
  st.setFrozenRows(1);
  return ss;
}

const normId_ = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const clean_ = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n || 100);
const num_ = v => { const x = Number(v); return isFinite(x) && x >= 0 ? Math.min(x, 1e7) : 0; };

function lookupStudentId_(idNorm) {
  try {
    const sh = SpreadsheetApp.openById(REGISTRY_ID).getSheetByName(REGISTRY_SHEET);
    const rows = sh.getRange(2, 1, Math.max(0, sh.getLastRow() - 1), REG.OmangPassport + 1).getValues();
    for (const r of rows) if (normId_(r[REG.OmangPassport]) === idNorm && idNorm) return String(r[REG.StudentID]);
  } catch (e) { /* registry not available - leave blank */ }
  return '';
}

// The app posts JSON as text/plain (avoids a CORS pre-flight). Nothing from the registry is sent back.
function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false, error: 'bad json' }); }
  if (!d || d.app !== 'aga-study') return out_({ ok: false, error: 'unknown sender' });
  if (d.type === 'photo') return out_(savePhoto_(d));
  const surname = clean_(d.surname), first = clean_(d.first), idRaw = clean_(d.idno, 40), idNorm = normId_(idRaw);
  if (!surname || !first || idNorm.length < 5) return out_({ ok: false, error: 'missing details' });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = getBook_();
    const studentId = lookupStudentId_(idNorm);
    const s = d.session || {}, t = d.totals || {};
    const lists = (Array.isArray(d.lists) ? d.lists : []).slice(0, 40)
      .map(l => `${clean_(l.title, 60)}: ${num_(l.practised)}/${num_(l.total)} practised, ${num_(l.mastered)} mastered`).join('; ');
    const now = new Date();
    const sessAcc = num_(s.answers) ? Math.round(100 * num_(s.correct) / num_(s.answers)) + '%' : '';
    const totAcc = num_(t.answered) ? Math.round(100 * num_(t.correct) / num_(t.answered)) + '%' : '';
    const last = t.last ? new Date(num_(t.last)) : '';
    ss.getSheetByName('Submissions').appendRow([now, surname, first, idRaw, studentId, num_(s.answers), num_(s.correct), sessAcc,
      num_(t.answered), totAcc, num_(t.practised), num_(t.mastered), last, lists, clean_(d.device, 40), clean_(d.version, 20)]);

    // Upsert the per-student summary row (matched on normalised Omang / Passport)
    const st = ss.getSheetByName('Students');
    const ids = st.getLastRow() > 1 ? st.getRange(2, 1, st.getLastRow() - 1, 1).getValues().map(r => normId_(r[0])) : [];
    const i = ids.indexOf(idNorm);
    if (i < 0) {
      st.appendRow([idRaw, surname, first, studentId, now, now, 1, num_(t.answered), totAcc, num_(t.practised), num_(t.mastered), last, lists]);
    } else {
      const row = i + 2;
      const prev = st.getRange(row, 1, 1, STU_HEAD.length).getValues()[0];
      st.getRange(row, 1, 1, STU_HEAD.length).setValues([[idRaw, surname, first, studentId || prev[3], prev[4] || now, now, (Number(prev[6]) || 0) + 1,
        num_(t.answered), totAcc, num_(t.practised), num_(t.mastered), last, lists]]);
    }
  } finally {
    lock.releaseLock();
  }
  return out_({ ok: true });
}

// ============================================================
// PHOTO SUBMISSIONS - students send photos for the Pocket Guide.
// Each photo is saved in the Drive folder "AGA Pocket Guide - Photo Submissions" and listed on the
// "Photos" tab of the progress sheet with Status = Pending. A trainer sets Status to Approved
// (or Rejected). Approved photos are pulled into the app by tools/sync-photos.js.
// ============================================================
const PHOTO_HEAD = ['Submitted', 'Species', 'Scientific name', 'App list', 'Item ID', 'First names', 'Surname', 'Omang / Passport',
  'Student ID (registry)', 'Where taken', 'Photo', 'File ID', 'Status', 'Notes'];
const PHOTO_COL = { species: 2, sci: 3, module: 4, item: 5, first: 6, surname: 7, fileId: 12, status: 13 };
const MAX_PHOTO_BYTES = 6 * 1024 * 1024;

function photoSheet_() {
  const ss = getBook_();
  let sh = ss.getSheetByName('Photos');
  if (!sh) {
    sh = ss.insertSheet('Photos');
    sh.getRange(1, 1, 1, PHOTO_HEAD.length).setValues([PHOTO_HEAD]).setFontWeight('bold').setBackground('#fbecd2');
    sh.setFrozenRows(1);
    sh.getRange(2, PHOTO_COL.status, 2000, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(['Pending', 'Approved', 'Rejected'], true).build());
  }
  return sh;
}
function photoFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('PHOTO_FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* recreate */ } }
  const f = DriveApp.createFolder('AGA Pocket Guide - Photo Submissions');
  props.setProperty('PHOTO_FOLDER_ID', f.getId());
  return f;
}
// Run once from the editor after updating the script: authorises Drive and creates the folder + Photos tab.
function setupPhotos() {
  Logger.log('Photos tab: ' + photoSheet_().getParent().getUrl());
  Logger.log('Photo folder: ' + photoFolder_().getUrl());
}

function savePhoto_(d) {
  const first = clean_(d.first), surname = clean_(d.surname), species = clean_(d.species, 80);
  if (!first || !surname || !species) return { ok: false, error: 'missing details' };
  if (d.consent !== true) return { ok: false, error: 'no consent' };
  const mime = /^image\/(jpeg|png|webp)$/.test(d.mime) ? d.mime : 'image/jpeg';
  let bytes;
  try { bytes = Utilities.base64Decode(String(d.image || '')); } catch (e) { return { ok: false, error: 'bad image' }; }
  if (!bytes.length || bytes.length > MAX_PHOTO_BYTES) return { ok: false, error: 'image too large' };
  const idRaw = clean_(d.idno, 40), idNorm = normId_(idRaw);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const stamp = Utilities.formatDate(new Date(), 'Africa/Gaborone', 'yyyy-MM-dd HHmm');
    const name = `${species} - ${first} ${surname} - ${stamp}.${mime.split('/')[1].replace('jpeg', 'jpg')}`;
    const file = photoFolder_().createFile(Utilities.newBlob(bytes, mime, name));
    file.setDescription(`Pocket Guide photo of ${species} by ${first} ${surname}. Where: ${clean_(d.where, 120)}`);
    photoSheet_().appendRow([new Date(), species, clean_(d.sci, 80), clean_(d.module, 40), clean_(d.itemId, 80), first, surname, idRaw,
      idNorm ? lookupStudentId_(idNorm) : '', clean_(d.where, 120), file.getUrl(), file.getId(), 'Pending', '']);
  } finally {
    lock.releaseLock();
  }
  return { ok: true };
}

// GET ?action=photos       -> list of Approved photos (no personal details except the credit name)
// GET ?action=photo&id=..  -> one Approved photo as base64 (Pending/Rejected photos are never served)
function approvedPhotos_() {
  const sh = photoSheet_();
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, PHOTO_HEAD.length).getValues()
    .filter(r => String(r[PHOTO_COL.status - 1]).trim() === 'Approved' && r[PHOTO_COL.fileId - 1])
    .map(r => ({ fileId: String(r[PHOTO_COL.fileId - 1]), species: String(r[PHOTO_COL.species - 1]), sci: String(r[PHOTO_COL.sci - 1]),
      module: String(r[PHOTO_COL.module - 1]), itemId: String(r[PHOTO_COL.item - 1]),
      credit: `${r[PHOTO_COL.first - 1]} ${r[PHOTO_COL.surname - 1]}`.trim(), submitted: r[0] }));
}
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'photos') return out_({ ok: true, photos: approvedPhotos_() });
  if (p.action === 'photo' && p.id) {
    if (!approvedPhotos_().some(x => x.fileId === p.id)) return out_({ ok: false, error: 'not approved' });
    const b = DriveApp.getFileById(p.id).getBlob();
    return out_({ ok: true, mime: b.getContentType(), b64: Utilities.base64Encode(b.getBytes()) });
  }
  return out_({ ok: true, service: 'AGA Study App progress' });
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
