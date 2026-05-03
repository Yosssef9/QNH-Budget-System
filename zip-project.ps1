$destination = "project-context.zip"
$tempFolder = "_chatgpt_zip_temp"

# Delete old files
Remove-Item $destination -Force -ErrorAction SilentlyContinue
Remove-Item $tempFolder -Recurse -Force -ErrorAction SilentlyContinue

# Create temp folder
New-Item -ItemType Directory -Path $tempFolder | Out-Null

# Copy project but exclude heavy/sensitive folders/files
robocopy . $tempFolder /E `
  /XD node_modules .git dist build coverage .vite `
  /XF .env .env.local .env.production project-context.zip `
  /NFL /NDL /NJH /NJS /nc /ns /np

# Zip temp folder
Compress-Archive -Path "$tempFolder\*" -DestinationPath $destination -Force

# Delete temp folder
Remove-Item $tempFolder -Recurse -Force

Write-Host "Project zipped successfully: $destination"