# Builds the app's logo and icon files from the official AGA logo files (Koru Designs, 2019) on Z:\.
# Run: powershell -ExecutionPolicy Bypass -File tools/make-icons.ps1
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$src = 'Z:\MULTIMEDIA\KORU DESIGNS\AFRICAN GUIDE ACADEMY\2019'
$emblem = "$src\AGA Icon\AGA_LogoFA_HighRes.png"
$white = "$src\AGA Logo Files\FULL COLOUR WHITE LOGO\PNG\AGA_LogoFA_HighRes.png"
$colour = "$src\AGA Logo Files\FULL COLOUR LOGO\PNG\AGA_LogoFA_HighRes.png"
$icons = Join-Path $root 'app\icons'; $brand = Join-Path $root 'app\brand'
New-Item -ItemType Directory -Force $icons, $brand | Out-Null
$dark = [System.Drawing.ColorTranslator]::FromHtml('#3d0f07')

function Resize($file, $width, $dest) {
  $img = [System.Drawing.Image]::FromFile($file)
  $h = [int]($img.Height * $width / $img.Width)
  $bmp = New-Object System.Drawing.Bitmap $width, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'; $g.SmoothingMode = 'HighQuality'; $g.PixelOffsetMode = 'HighQuality'
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.DrawImage($img, 0, 0, $width, $h)
  $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose(); $img.Dispose()
}
# Square icon: emblem centred on dark brown; 'fill' = share of the height the emblem uses (small for maskable safe zone)
function Icon($size, $fill, $dest) {
  $img = [System.Drawing.Image]::FromFile($emblem)
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'; $g.SmoothingMode = 'HighQuality'; $g.PixelOffsetMode = 'HighQuality'
  $g.Clear($dark)
  $h = $size * $fill; $w = $h * $img.Width / $img.Height
  $g.DrawImage($img, [float](($size - $w) / 2), [float](($size - $h) / 2), [float]$w, [float]$h)
  $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose(); $img.Dispose()
}

Resize $white 640 (Join-Path $brand 'logo-white.png')
Resize $colour 640 (Join-Path $brand 'logo-colour.png')
Resize $emblem 240 (Join-Path $brand 'emblem.png')
Icon 192 0.74 (Join-Path $icons 'icon-192.png')
Icon 512 0.74 (Join-Path $icons 'icon-512.png')
Icon 512 0.58 (Join-Path $icons 'icon-maskable-512.png')
Icon 180 0.72 (Join-Path $icons 'apple-touch-icon.png')
Icon 64 0.8 (Join-Path $icons 'favicon-64.png')
Get-ChildItem $brand, $icons | Select Name, Length | Format-Table -Auto | Out-String
