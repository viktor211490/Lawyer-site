param(
  [Parameter(Mandatory = $true)]
  [string]$DestinationPath,

  [string]$RepoName = "Lawyer-site"
)

$ErrorActionPreference = "Stop"

function Copy-RepoTree {
  param(
    [Parameter(Mandatory = $true)][string]$SourceRoot,
    [Parameter(Mandatory = $true)][string]$DestRoot
  )

  $excludeDirs = @(
    ".git",
    "node_modules",
    "bin",
    "obj",
    "dist",
    ".angular",
    ".vs",
    ".idea"
  )

  $excludeFiles = @(
    "lawyer-site.db",
    "lawyer-site.db-shm",
    "lawyer-site.db-wal"
  )

  New-Item -ItemType Directory -Force -Path $DestRoot | Out-Null

  Get-ChildItem -LiteralPath $SourceRoot -Force | ForEach-Object {
    $name = $_.Name
    if ($excludeDirs -contains $name) { return }
    if ($excludeFiles -contains $name) { return }

    $src = $_.FullName
    $dst = Join-Path $DestRoot $name

    if ($_.PSIsContainer) {
      Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force -Exclude $excludeFiles
    } else {
      Copy-Item -LiteralPath $src -Destination $dst -Force
    }
  }
}

$sourceRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$destRoot = Join-Path (Resolve-Path $DestinationPath) $RepoName

if (Test-Path -LiteralPath $destRoot) {
  throw "Destination already exists: $destRoot"
}

Write-Host "Creating clone at: $destRoot"
Copy-RepoTree -SourceRoot $sourceRoot -DestRoot $destRoot

Push-Location $destRoot
try {
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Warning "git not found in PATH; skipping repo init."
    exit 0
  }

  git init | Out-Null
  git add -A | Out-Null
  git commit -m "Initial import from Lawyer-site" | Out-Null

  Write-Host "Done. Next steps:"
  Write-Host " - Review README and branding"
  Write-Host " - Change admin credentials and JWT SecretKey"
  Write-Host " - Consider switching DB name/connection string"
}
finally {
  Pop-Location
}

