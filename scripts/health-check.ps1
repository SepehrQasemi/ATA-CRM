param(
  [switch]$SkipE2E
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "[CRM Health]" $Message -ForegroundColor Cyan
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

Write-Step "Running lint..."
npm run lint

Write-Step "Running build..."
npm run build

if (-not $SkipE2E) {
  Write-Step "Running end-to-end tests..."
  npm run test:e2e
} else {
  Write-Step "Skipping end-to-end tests (requested)."
}

Write-Step "All requested health checks passed."
