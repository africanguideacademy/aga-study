# Publishes the app to the live website (GitHub Pages).
# Commits any changes, pushes them to "main", then copies the app/ folder to the "gh-pages" branch that the website serves.
# Run:  powershell -ExecutionPolicy Bypass -File tools/publish.ps1 "what changed"
param([string]$Message = "Update study app")
$env:Path = "C:\Program Files\Git\cmd;C:\Program Files\GitHub CLI;" + $env:Path
Set-Location (Split-Path $PSScriptRoot -Parent)
git add -A
git diff --cached --quiet
if (-not $?) { git commit -m $Message }
git push origin main
$split = git subtree split --prefix app main
git push origin "${split}:refs/heads/gh-pages" --force
"Published. The site updates within a minute or two: https://africanguideacademy.github.io/aga-study/"
