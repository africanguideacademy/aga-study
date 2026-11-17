# Extracts bird name + photo + call from each slide of the AGA bird-call presentations
# (one bird per slide) into app/media/<set>/ and writes data/<set>.json for build-data.js.
# Run: powershell -ExecutionPolicy Bypass -File tools/extract-pptx.ps1
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$sets = @(
  @{ id = 'prominent40'; file = 'Y:\TRAINING\TRAINER LAPTOP BACK-UP\Animal Calls\BQA 40 Prominent Birds.pptx' },
  @{ id = 'kwapa63';     file = 'Y:\TRAINING\TRAINER LAPTOP BACK-UP\Animal Calls\Kwapa Bird Call List.pptx' }
)
# Slide-title typos -> correct names
$fix = @{
  'Swainsons Spurfowl' = "Swainson's Spurfowl"; 'Spurwing Goose' = 'Spur-winged Goose'; "Bennet's Woodpecker" = "Bennett's Woodpecker";
  'Water Thicknee' = 'Water Thick-knee'; 'Hammerkop' = 'Hamerkop'; 'Forked-tailed Drongo' = 'Fork-tailed Drongo';
  'Great Egret Zitting Cisticola' = 'Zitting Cisticola'; "Diederik's Cuckoo" = 'Diederik Cuckoo'; 'Grey Go-away Bird' = 'Grey Go-away-bird';
  "Verreaux's Eagle Owl" = "Verreaux's Eagle-Owl"; 'Emerald-spotted Wood-dove' = 'Emerald-spotted Wood-Dove'; 'Openbill' = 'African Openbill'
}
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 80L
function ReadEntry($z, $name) { $e = $z.GetEntry($name); if (-not $e) { return $null }; $r = New-Object IO.StreamReader($e.Open()); $t = $r.ReadToEnd(); $r.Close(); return $t }
function Slug($s) { (($s.ToLower() -replace "'", '') -replace '[^a-z0-9]+', '-').Trim('-') }

foreach ($set in $sets) {
  $outDir = Join-Path $root "app\media\$($set.id)"; New-Item -ItemType Directory -Force $outDir | Out-Null
  $z = [IO.Compression.ZipFile]::OpenRead($set.file)
  $slides = $z.Entries | Where-Object { $_.FullName -match '^ppt/slides/slide(\d+)\.xml$' } | Sort-Object { [int]([regex]::Match($_.Name, '\d+').Value) }
  $items = @()
  foreach ($s in $slides) {
    $n = [int]([regex]::Match($s.Name, '\d+').Value)
    $xml = ReadEntry $z $s.FullName
    $title = (([regex]::Matches($xml, '<a:t>([^<]*)</a:t>') | ForEach-Object { $_.Groups[1].Value }) -join '')
    $title = ($title -replace [char]0x2019, "'" -replace '\s+', ' ').Trim()
    $title = ($title -creplace '([a-z])([A-Z])', '$1 $2')  # runs joined without a space: "GreatEgret" -> "Great Egret" (case-sensitive!)
    $title = ($title -replace '\s+', ' ').Trim()
    if ($fix.ContainsKey($title)) { $title = $fix[$title] }
    $rels = ReadEntry $z "ppt/slides/_rels/slide$n.xml.rels"
    $targets = [regex]::Matches($rels, 'Target="\.\./media/([^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique
    $img = $targets | Where-Object { $_ -match '\.(jpe?g)$' } | Select-Object -First 1
    $mp3 = $targets | Where-Object { $_ -match '\.mp3$' } | Select-Object -First 1
    $slug = Slug $title
    $item = [ordered]@{ slide = $n; name = $title; photo = ''; call = ''; bytes = 0 }
    if ($img) {
      $dest = Join-Path $outDir "$slug.jpg"
      if (-not (Test-Path $dest)) {
        $st = $z.GetEntry("ppt/media/$img").Open(); $ms = New-Object IO.MemoryStream; $st.CopyTo($ms); $st.Close()
        $im = [System.Drawing.Image]::FromStream($ms)
        if ($im.PropertyIdList -contains 0x0112) { switch ($im.GetPropertyItem(0x0112).Value[0]) { 3 { $im.RotateFlip('Rotate180FlipNone') } 6 { $im.RotateFlip('Rotate90FlipNone') } 8 { $im.RotateFlip('Rotate270FlipNone') } } }
        $scale = [Math]::Min([double]1.0, [double]1000 / [Math]::Max($im.Width, $im.Height))
        $w = [int]($im.Width * $scale); $h = [int]($im.Height * $scale)
        $bmp = New-Object System.Drawing.Bitmap $w, $h; $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = 'HighQualityBicubic'; $g.DrawImage($im, 0, 0, $w, $h); $bmp.Save($dest, $codec, $ep)
        $g.Dispose(); $bmp.Dispose(); $im.Dispose(); $ms.Dispose()
      }
      $item.photo = "media/$($set.id)/$slug.jpg"
    }
    if ($mp3) {
      $dest = Join-Path $outDir "$slug.mp3"
      if (-not (Test-Path $dest)) { [IO.Compression.ZipFileExtensions]::ExtractToFile($z.GetEntry("ppt/media/$mp3"), $dest, $true) }
      $item.call = "media/$($set.id)/$slug.mp3"; $item.bytes = (Get-Item $dest).Length
    }
    $items += New-Object PSObject -Property $item
  }
  $z.Dispose()
  $items | ConvertTo-Json -Depth 3 | Set-Content (Join-Path $root "data\$($set.id).json") -Encoding utf8
  "{0}: {1} slides, {2} photos, {3} calls" -f $set.id, $items.Count, ($items | Where-Object photo).Count, ($items | Where-Object call).Count
  ($items | ForEach-Object { $_.name }) -join ' | '
  "No call: " + (($items | Where-Object { -not $_.call } | ForEach-Object { $_.name }) -join ', ')
}
