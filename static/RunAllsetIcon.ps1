<#
.SYNOPSIS
    Finds and executes all "setIcon.bat" files in subfolders.
    Before execution, it unblocks related files to suppress security warnings.
    It can optionally skip folders that already have a custom icon set.
#>

# --- Prepare Script ---
# Get the script's own location to use as the starting point for the search.
$basePath = $PSScriptRoot

Write-Host "Starting search in folder: $basePath" -ForegroundColor Green

# --- Ask user if they want to skip existing folders ---
$skipExisting = $false
while ($true) {
    $choice = Read-Host "Skip folders that already have a custom icon? (y/n)"
    if ($choice.ToLower() -eq 'y') {
        $skipExisting = $true
        Write-Host "OK, folders with existing icons will be skipped." -ForegroundColor Yellow
        break
    } elseif ($choice.ToLower() -eq 'n') {
        $skipExisting = $false
        Write-Host "OK, all found 'setIcon.bat' files will be executed." -ForegroundColor Yellow
        break
    } else {
        Write-Host "Invalid input. Please enter 'y' or 'n'." -ForegroundColor Red
    }
}

# --- 1. Unblock all files ---
Write-Host "Unblocking files in subfolders..." -ForegroundColor Yellow
Get-ChildItem -Path $basePath -Recurse | Unblock-File
Write-Host "Unblocking complete." -ForegroundColor Green

# --- 2. Find and execute setIcon.bat ---
$setIconScripts = Get-ChildItem -Path $basePath -Recurse -Filter "setIcon.bat"

if ($setIconScripts) {
    Write-Host "Found $($setIconScripts.Count) setIcon.bat file(s). Processing them now." -ForegroundColor Green
    
    foreach ($script in $setIconScripts) {
        $parentFolder = $script.Directory
        $shouldExecute = $true # Default to execute

        # If skipping is enabled, check the folder's attributes
        if ($skipExisting) {
            # Check if the folder has the ReadOnly attribute set.
            if ($parentFolder.Attributes -band [System.IO.FileAttributes]::ReadOnly) {
                Write-Host "Skipping: $($parentFolder.FullName) (already set)" -ForegroundColor Gray
                $shouldExecute = $false
            }
        }

        # Execute only if not skipped
        if ($shouldExecute) {
            Write-Host "Executing: $($script.FullName)" -ForegroundColor Cyan
            Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"$($script.FullName)`"" -Wait -WindowStyle Hidden
        }
    }
    
    Write-Host "All tasks completed." -ForegroundColor Green
} else {
    Write-Host "No setIcon.bat files were found to execute." -ForegroundColor Red
}

ie4uinit.exe -ClearIconCache
ie4uinit.exe -show

# Wait for user input before closing the window.
Read-Host "Processing complete. Press Enter to close this window."