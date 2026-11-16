# Draws the app icons (AGA on dark green) into app/icons.  Run: powershell -File tools/make-icons.ps1
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$dir = Join-Path $root 'app\icons'
New-Item -ItemType Directory -Force $dir | Out-Null
foreach ($size in 192, 512, 180) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'; $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml('#2f3b2a'))
  $cream = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#f4efe4'))
  $amber = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#d9963f'))
  $font = New-Object System.Drawing.Font 'Segoe UI', ([float]($size * 0.25)), ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $small = New-Object System.Drawing.Font 'Segoe UI', ([float]($size * 0.095)), ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = 'Center'; $fmt.LineAlignment = 'Center'
  $g.DrawString('AGA', $font, $cream, (New-Object System.Drawing.RectangleF 0, ([float]($size * -0.06)), $size, $size), $fmt)
  $g.FillRectangle($amber, [float]($size * 0.34), [float]($size * 0.555), [float]($size * 0.32), [float]($size * 0.022))
  $g.DrawString('STUDY', $small, $cream, (New-Object System.Drawing.RectangleF 0, ([float]($size * 0.15)), $size, $size), $fmt)
  $name = if ($size -eq 180) { 'apple-touch-icon.png' } else { "icon-$size.png" }
  $bmp.Save((Join-Path $dir $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
"Icons written to $dir"
