# Finds where the spoken introduction ("Bocage's tree frog ... Leptopelis bocagii") ends in each frog call.
# The CD pattern is: short silence, common name, pause, scientific name, pause, then the call.
# Writes data/frog-trim.json { "file.mp3": secondsToCut } and prints anything unusual for checking.
$ff = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet" -Recurse -Filter ffmpeg.exe -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
$root = Split-Path $PSScriptRoot -Parent
$dir = 'Y:\TRAINING\TRAINER LAPTOP BACK-UP\Animal Calls\Frog Calls'
$inv = [Globalization.CultureInfo]::InvariantCulture
$result = [ordered]@{}; $report = @()
Get-ChildItem $dir -Filter *.mp3 | Where-Object { $_.Name -notlike '._*' } | Sort-Object Name | ForEach-Object {
  $o = & $ff -hide_banner -nostats -t 12 -i $_.FullName -af "silencedetect=noise=-38dB:d=0.3" -f null - 2>&1 | Out-String
  $s = @([regex]::Matches($o, 'silence_start: ([\d\.]+)') | ForEach-Object { [double]::Parse($_.Groups[1].Value, $inv) })
  $e = @([regex]::Matches($o, 'silence_end: ([\d\.]+)') | ForEach-Object { [double]::Parse($_.Groups[1].Value, $inv) })
  # gaps that END after some speech has started (> 1.0 s) and within the first 8 s
  $ends = @($e | Where-Object { $_ -gt 1.0 -and $_ -lt 8 })
  # the intro = common name + scientific name -> use the 2nd pause if it is within 7 s, else the 1st
  $cut = 0; $why = ''
  if ($ends.Count -ge 2 -and $ends[1] -le 7) { $cut = $ends[1]; $why = '2nd pause' }
  elseif ($ends.Count -ge 1) { $cut = $ends[0]; $why = 'only 1 pause' }
  else { $why = 'NO PAUSE FOUND' }
  $cut = [Math]::Max(0, $cut - 0.15)   # keep a tiny lead-in before the call
  $result[$_.Name] = [Math]::Round($cut, 2)
  $pairs = for ($i = 0; $i -lt [Math]::Min(5, $s.Count); $i++) { '{0:N1}-{1:N1}' -f $s[$i], $(if ($i -lt $e.Count) { $e[$i] } else { 0 }) }
  $report += [pscustomobject]@{ File = $_.Name.Substring(0, [Math]::Min(44, $_.Name.Length)); Cut = [Math]::Round($cut, 1); Rule = $why; Silences = ($pairs -join ', ') }
}
$result | ConvertTo-Json | Set-Content (Join-Path $root 'data\frog-trim.json') -Encoding utf8
$report | Group-Object Rule | ForEach-Object { "{0}: {1}" -f $_.Name, $_.Count }
"Cut range: {0:N1}s - {1:N1}s" -f ($report.Cut | Measure-Object -Minimum).Minimum, ($report.Cut | Measure-Object -Maximum).Maximum
"--- Unusual (not '2nd pause', or cut < 3s or > 6s) ---"
$report | Where-Object { $_.Rule -ne '2nd pause' -or $_.Cut -lt 3 -or $_.Cut -gt 6 } | Format-Table -AutoSize | Out-String -Width 200
