# WordRush Deployment Script (PowerShell)
# Usage: .\scripts\deploy.ps1 [message]

param(
    [string]$Message = "Update: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 WordRush Deployment Script" -ForegroundColor Green
Write-Host ""

# Check if we're in a git repository
if (-not (Test-Path .git)) {
    Write-Host "❌ Error: Not a git repository" -ForegroundColor Red
    exit 1
}

# Check for uncommitted changes
$status = git status --porcelain
if ($status) {
    Write-Host "⚠️  Uncommitted changes detected" -ForegroundColor Yellow
    Write-Host "Staging all changes..."
    git add -A
}

# Check if there are changes to commit
$staged = git diff --staged --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "⚠️  No changes to commit" -ForegroundColor Yellow
} else {
    Write-Host "📝 Committing changes..." -ForegroundColor Green
    git commit -m $Message
}

# Get current branch
$branch = git branch --show-current
Write-Host "🌿 Current branch: $branch" -ForegroundColor Green

# Ask for confirmation before pushing
$confirmation = Read-Host "Push to origin/$branch? (y/n)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "❌ Deployment cancelled" -ForegroundColor Yellow
    exit 0
}

# Push to remote
Write-Host "📤 Pushing to origin/$branch..." -ForegroundColor Green
git push origin $branch

Write-Host ""
Write-Host "✅ Deployment initiated!" -ForegroundColor Green
Write-Host "📋 GitHub Actions will handle the build and deployment" -ForegroundColor Yellow

# Try to get GitHub repo URL
$remoteUrl = git config --get remote.origin.url
if ($remoteUrl -match 'github\.com[:/](.+?)(?:\.git)?$') {
    $repoPath = $matches[1]
    Write-Host "🔗 Check status at: https://github.com/$repoPath/actions" -ForegroundColor Yellow
}

