# Script for commit and push
# Run: .\git-commit-push.ps1

Set-Location $PSScriptRoot

# Remove lock file if exists
if (Test-Path ".git\index.lock") {
    Remove-Item ".git\index.lock" -Force
    Write-Host "Removed .git\index.lock"
}

# Add all changes
git add -A
Write-Host "Files added to index"

# Commit with Russian message
$commitMessage = "Realizaciya treh funkciy AI: O chem statya, Tezisy, Post dlya Telegram"
git commit -m $commitMessage

if ($LASTEXITCODE -eq 0) {
    # Push to remote repository
    git push
    Write-Host "Done: commit and push completed"
} else {
    Write-Host "Commit failed. Check status: git status"
}
