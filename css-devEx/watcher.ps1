# =====================================
# Holy Expressor CSS Watcher V0 (Brute Force)
# =====================================

$watchPath = "C:\Users\Ben\Documents\__NEXUS\_GRID\_GRID_Ae\_SCRIPTS__Ae\HOLY EXPRESSOR X\Holy-Expressor-Repo\css-devEx\raw-downloads"
$hotFile   = "C:\Users\Ben\Documents\__NEXUS\_GRID\_GRID_Ae\_SCRIPTS__Ae\HOLY EXPRESSOR X\Holy-Expressor-Repo\css\styles.css"

Write-Host "Holy Expressor CSS watcher active (BRUTE FORCE MODE)..."
Write-Host "Watching: $watchPath"
Write-Host "Updating: $hotFile"
Write-Host "---------------------------------------------`n"

function Update-Hotfile {

    # Let Chrome finish writing whatever weird shit it's doing
    Start-Sleep -Milliseconds 200

    $cssFiles = Get-ChildItem -Path $watchPath -File -Filter "*.css"

    if ($cssFiles.Count -eq 0) { return }

    # Always pick the newest file
    $newest = $cssFiles | Sort-Object LastWriteTime -Descending | Select-Object -First 1

    Write-Host "Detected update from: $($newest.Name)"
    Write-Host "Copying → styles.css ..."

    Copy-Item -Path $newest.FullName -Destination $hotFile -Force

    Write-Host "styles.css updated."
    Write-Host "---------------------------------------------`n"
}

# FileSystemWatcher (NO FILTERING, NO SUBTLETY)
$fsw = New-Object System.IO.FileSystemWatcher
$fsw.Path = $watchPath
$fsw.Filter = "*.*"   # ANY event triggers our brute logic
$fsw.IncludeSubdirectories = $false
$fsw.EnableRaisingEvents = $true
$fsw.NotifyFilter = [System.IO.NotifyFilters]'FileName, LastWrite, CreationTime'

$action = {
    Update-Hotfile
}

# Bind ALL event types to the same handler
Register-ObjectEvent $fsw Created -Action $action | Out-Null
Register-ObjectEvent $fsw Changed -Action $action | Out-Null
Register-ObjectEvent $fsw Renamed -Action $action | Out-Null

# Stay alive forever
while ($true) {
    Start-Sleep -Seconds 1
}
