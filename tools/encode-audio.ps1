# Re-encodes every call in the app from its original recording:
#   - mono, 56 kbps, 32 kHz MP3, no embedded album art or tags  (about 2-3x smaller, loads much faster on phones)
#   - frog calls: cuts the spoken introduction (name + scientific name) using data/frog-trim.json
# Sources: data/media-plan.json (bird + frog calls from Y:\) and the presentation sets already in app/media.
# Run: powershell -ExecutionPolicy Bypass -File tools/encode-audio.ps1   (add -Force to redo files already done)
param([switch]$Force)
$ff = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet" -Recurse -Filter ffmpeg.exe -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
if (-not $ff) { throw 'ffmpeg not found - install with: winget install Gyan.FFmpeg.Essentials' }
$root = Split-Path $PSScriptRoot -Parent
$plan = Get-Content -Raw -Encoding UTF8 (Join-Path $root 'data\media-plan.json') | ConvertFrom-Json
$trimJson = Get-Content -Raw -Encoding UTF8 (Join-Path $root 'data\frog-trim.json') | ConvertFrom-Json
$trim = @{}; $trimJson.PSObject.Properties | ForEach-Object { $trim[$_.Name] = [double]$_.Value }
$stampDir = Join-Path $root 'data\.encoded'; New-Item -ItemType Directory -Force $stampDir | Out-Null
$inv = [Globalization.CultureInfo]::InvariantCulture
$enc = @('-ac', '1', '-ar', '32000', '-c:a', 'libmp3lame', '-b:a', '56k', '-map', '0:a:0', '-map_metadata', '-1', '-id3v2_version', '0', '-write_xing', '1')

function Encode($src, $dest, $cut) {
  $stamp = Join-Path $stampDir (($dest.Substring($root.Length + 1)) -replace '[\\/:]', '_')
  if ((Test-Path $stamp) -and -not $Force) { return 'skip' }
  $tmp = "$dest.tmp.mp3"
  $args = @('-hide_banner', '-loglevel', 'error', '-y')
  if ($cut -gt 0) { $args += @('-ss', $cut.ToString('0.00', $inv)) }
  $args += @('-i', $src) + $enc + @($tmp)
  & $ff @args 2>$null
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path $tmp)) {
    # Some presentation files carry a broken WAV-style header in front of the MP3 data: force the MP3 reader
    $args2 = @('-hide_banner', '-loglevel', 'quiet', '-y', '-f', 'mp3') + $args[4..($args.Count - 1)]
    & $ff @args2 2>$null
    if (-not (Test-Path $tmp) -or (Get-Item $tmp).Length -lt 5000) { Remove-Item $tmp -ErrorAction SilentlyContinue; return 'FAIL' }
  }
  Move-Item -Force $tmp $dest
  Set-Content $stamp $cut
  return 'ok'
}

$jobs = @()
foreach ($c in $plan.calls) {
  $name = [IO.Path]::GetFileName($c.src)
  $cut = if ($c.dest -like '*\media\frogs\*' -and $trim.ContainsKey($name)) { $trim[$name] } else { 0 }
  $jobs += [pscustomobject]@{ src = $c.src; dest = $c.dest; cut = $cut }
}
# presentation sets: originals were extracted into app/media; keep a pristine copy once, encode from it
foreach ($set in 'prominent40', 'kwapa63') {
  $dir = Join-Path $root "app\media\$set"; $orig = Join-Path $root "data\originals\$set"
  New-Item -ItemType Directory -Force $orig | Out-Null
  Get-ChildItem $dir -Filter *.mp3 | ForEach-Object {
    $o = Join-Path $orig $_.Name
    if (-not (Test-Path $o)) { Copy-Item $_.FullName $o }
    $jobs += [pscustomobject]@{ src = $o; dest = $_.FullName; cut = 0 }
  }
}
$before = 0; $after = 0; $counts = @{ ok = 0; skip = 0; FAIL = 0 }; $i = 0
foreach ($j in $jobs) {
  $i++
  $b = if (Test-Path $j.dest) { (Get-Item $j.dest).Length } else { 0 }
  $r = Encode $j.src $j.dest $j.cut
  $counts[$r]++
  if ($r -eq 'ok') { $before += $b; $after += (Get-Item $j.dest).Length }
  if ($r -eq 'FAIL') { "FAILED: $($j.src)" }
  if ($i % 100 -eq 0) { "... $i / $($jobs.Count)" }
}
"Done: {0} encoded, {1} already done, {2} failed" -f $counts.ok, $counts.skip, $counts.FAIL
if ($counts.ok) { "Size of re-encoded files: {0:N0} MB -> {1:N0} MB" -f ($before / 1MB), ($after / 1MB) }
