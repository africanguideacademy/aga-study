# Copies media listed in data/media-plan.json into app/media.
# Photos are resized to max 1000px (long side) and saved as JPEG quality 80.
# Calls are copied as-is.   Run:  powershell -File tools/copy-media.ps1
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$plan = Get-Content -Raw -Encoding UTF8 (Join-Path $root 'data\media-plan.json') | ConvertFrom-Json
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 80L
$max = 1000

foreach ($p in $plan.photos) {
  New-Item -ItemType Directory -Force (Split-Path $p.dest) | Out-Null
  if (Test-Path -LiteralPath $p.dest) { continue }
  $img = [System.Drawing.Image]::FromFile($p.src)
  # honour EXIF orientation
  if ($img.PropertyIdList -contains 0x0112) {
    switch ($img.GetPropertyItem(0x0112).Value[0]) {
      3 { $img.RotateFlip('Rotate180FlipNone') } 6 { $img.RotateFlip('Rotate90FlipNone') } 8 { $img.RotateFlip('Rotate270FlipNone') }
    }
  }
  $scale = [Math]::Min([double]1.0, [double]$max / [Math]::Max($img.Width, $img.Height))
  $w = [int]($img.Width * $scale); $h = [int]($img.Height * $scale)
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'; $g.SmoothingMode = 'HighQuality'; $g.PixelOffsetMode = 'HighQuality'
  $g.DrawImage($img, 0, 0, $w, $h)
  $bmp.Save($p.dest, $codec, $ep)
  $g.Dispose(); $bmp.Dispose(); $img.Dispose()
}
"Photos done"
foreach ($c in $plan.calls) {
  New-Item -ItemType Directory -Force (Split-Path $c.dest) | Out-Null
  if (-not (Test-Path -LiteralPath $c.dest)) { Copy-Item -LiteralPath $c.src -Destination $c.dest }
}
"Calls done"
$b = Get-ChildItem (Join-Path $root 'app\media\birds') -File; $s = Get-ChildItem (Join-Path $root 'app\media\calls') -File
"Photos: {0} files, {1:N1} MB   Calls: {2} files, {3:N1} MB" -f $b.Count, (($b | Measure-Object Length -Sum).Sum/1MB), $s.Count, (($s | Measure-Object Length -Sum).Sum/1MB)
