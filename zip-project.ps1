$destination = "project-context.zip"
$tempFolder = "_chatgpt_zip_temp"

Write-Host "Cleaning old zip/temp files..."

Remove-Item $destination -Force -ErrorAction SilentlyContinue
Remove-Item $tempFolder -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Creating temp folder..."

New-Item -ItemType Directory -Path $tempFolder | Out-Null

Write-Host "Copying project files..."

robocopy . $tempFolder /E `
  /XD node_modules .git dist build coverage .vite docs .playwright-cli .codex $tempFolder `
  /XF .env .env.local .env.production project-context.zip `
  /NFL /NDL /NJH /NJS /NC /NS /NP

$robocopyExitCode = $LASTEXITCODE

# Robocopy exit codes 0–7 indicate success or non-fatal differences.
if ($robocopyExitCode -ge 8) {
    Write-Host "❌ Robocopy failed with exit code: $robocopyExitCode"
    Remove-Item $tempFolder -Recurse -Force -ErrorAction SilentlyContinue
    exit $robocopyExitCode
}

Write-Host "Zipping using 7-Zip..."

# Detect 7-Zip path automatically (supports both installations)
$sevenZipPath = "C:\Program Files\7-Zip\7z.exe"

if (!(Test-Path $sevenZipPath)) {
    $sevenZipPath = "C:\Program Files (x86)\7-Zip\7z.exe"
}

if (!(Test-Path $sevenZipPath)) {
    Write-Host "❌ 7-Zip not found. Please check the installation path."
    Remove-Item $tempFolder -Recurse -Force -ErrorAction SilentlyContinue
    exit 1
}

# Create ZIP archive
& $sevenZipPath a -tzip $destination "$tempFolder\*" -mx=9

$sevenZipExitCode = $LASTEXITCODE

if ($sevenZipExitCode -ne 0) {
    Write-Host "❌ 7-Zip failed with exit code: $sevenZipExitCode"
    Remove-Item $tempFolder -Recurse -Force -ErrorAction SilentlyContinue
    exit $sevenZipExitCode
}

Write-Host "Cleaning temp folder..."

Remove-Item $tempFolder -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "✅ Project zipped successfully: $destination"