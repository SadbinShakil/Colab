# PowerShell script to restore project from GitHub
Set-Location "C:\Users\100945766\Downloads"

# Remove current problematic directory
if (Test-Path "Thesis-master") {
    Remove-Item "Thesis-master" -Recurse -Force
}

# Clone fresh from GitHub
git clone https://github.com/sakilsarker/Thesis-master.git

Write-Host "Project restored successfully from GitHub"
