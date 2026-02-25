# Setup environment files for Docker Compose
# Run this before first 'docker compose up' if .env files don't exist

$root = $PSScriptRoot

# Root .env for docker-compose
if (-not (Test-Path "$root\.env")) {
    Copy-Item "$root\.env.example" "$root\.env"
    Write-Host "Created .env from .env.example"
} else {
    Write-Host ".env already exists"
}

# Backend .env (required for env_file in docker-compose)
if (-not (Test-Path "$root\import-machine-backend\.env")) {
    Copy-Item "$root\import-machine-backend\env.example" "$root\import-machine-backend\.env"
    Write-Host "Created import-machine-backend/.env from env.example"
    Write-Host "  IMPORTANT: Update DB_USER and DB_PASSWORD in import-machine-backend/.env to match .env (or leave as-is and update .env)"
} else {
    Write-Host "import-machine-backend/.env already exists"
}

Write-Host "`nDone. Ensure DB_USER and DB_PASSWORD match between .env and import-machine-backend/.env"
Write-Host "Then run: docker compose up -d"
