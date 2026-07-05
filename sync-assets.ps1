# PowerShell script to sync game assets to the Android project assets folder
$sourceDir = Get-Location
$destDir = Join-Path $sourceDir "android\app\src\main\assets"

if (!(Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
}

$files = @("index.html", "game.js", "style.css", "ultra2d.css")

foreach ($file in $files) {
    $srcFile = Join-Path $sourceDir $file
    $destFile = Join-Path $destDir $file
    if (Test-Path $srcFile) {
        Copy-Item $srcFile $destFile -Force
        Write-Host "Copied $file to Android assets." -ForegroundColor Green
    } else {
        Write-Host "Warning: $file not found in workspace." -ForegroundColor Yellow
    }
}
