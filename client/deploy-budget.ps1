$ErrorActionPreference = "Stop"

$source = Join-Path $PSScriptRoot "dist"
$destination = "D:\NodeJS\QNHPortal\public\budget-system"

Write-Host ""
Write-Host "Deploying Budget System frontend..."
Write-Host "Source:      $source"
Write-Host "Destination: $destination"
Write-Host ""

# Make sure the frontend build exists.
if (-not (Test-Path $source -PathType Container)) {
    throw "The dist folder does not exist: $source. Run npm run build first."
}

# Make sure dist contains the React entry file.
$indexFile = Join-Path $source "index.html"

if (-not (Test-Path $indexFile -PathType Leaf)) {
    throw "index.html was not found inside dist. Run npm run build first."
}

# Create the destination folder if it does not exist.
if (-not (Test-Path $destination -PathType Container)) {
    New-Item `
        -ItemType Directory `
        -Path $destination `
        -Force | Out-Null
}

# Mirror dist into the QNH Portal folder.
#
# /MIR:
# - Copies all files and subfolders from dist.
# - Replaces changed files.
# - Deletes old destination files that are no longer in dist.
#
# /R:2 retries failed copies twice.
# /W:1 waits one second between retries.
robocopy `
    $source `
    $destination `
    /MIR `
    /R:2 `
    /W:1 `
    /NFL `
    /NDL `
    /NJH `
    /NJS `
    /NP

$robocopyExitCode = $LASTEXITCODE

# Robocopy codes 0 through 7 are successful results.
# Codes 8 and above indicate an actual failure.
if ($robocopyExitCode -ge 8) {
    throw "Deployment failed. Robocopy exit code: $robocopyExitCode"
}

Write-Host ""
Write-Host "Budget System frontend deployed successfully."
Write-Host "Open: http://10.0.110.28:4000/budget-system/"
Write-Host ""

exit 0