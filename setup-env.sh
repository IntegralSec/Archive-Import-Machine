#!/bin/sh
# Setup environment files for Docker Compose
# Run this before first 'docker compose up' if .env files don't exist

root="$(cd "$(dirname "$0")" && pwd)"

# Root .env for docker-compose
if [ ! -f "$root/.env" ]; then
    cp "$root/.env.example" "$root/.env"
    echo "Created .env from .env.example"
else
    echo ".env already exists"
fi

# Backend .env (required for env_file in docker-compose)
if [ ! -f "$root/import-machine-backend/.env" ]; then
    cp "$root/import-machine-backend/env.example" "$root/import-machine-backend/.env"
    echo "Created import-machine-backend/.env from env.example"
    echo "  IMPORTANT: Update DB_USER and DB_PASSWORD in import-machine-backend/.env to match .env (or leave as-is and update .env)"
else
    echo "import-machine-backend/.env already exists"
fi

echo ""
echo "Done. Ensure DB_USER and DB_PASSWORD match between .env and import-machine-backend/.env"
echo "Then run: docker compose up -d"
