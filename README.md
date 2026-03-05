# Archive Import Machine

A web application for importing EML files into your archive. Package EML files into batches, upload to S3, and trigger the archive import process.

## Features

- Select EML files to import
- Package EML files into ZIP batches with manifest JSON
- Upload to S3 bucket
- Trigger the archive import process
- Monitor import progress and generate reports
- Validate imported files

## Tech Stack

- **Frontend:** React 19, Material-UI (MUI), React Router
- **Backend:** Node.js/Express
- **Database:** PostgreSQL 16
- **Deployment:** Docker Compose

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- Archive URL and API key
- S3 bucket credentials (for file uploads)

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/your-username/import-machine.git
cd import-machine
```

### 2. Configure environment

**Option A: Use the setup script (Windows PowerShell)**

```powershell
.\setup-env.ps1
```

**Option B: Manual setup**

```bash
cp .env.example .env
cp import-machine-backend/env.example import-machine-backend/.env
```

Edit `.env` and `import-machine-backend/.env` with your settings (Archive URL, API key, S3 credentials, etc.).

### 3. Run with Docker Compose

```bash
docker compose up -d
```

The app will be available at **http://localhost:3000**. The frontend is exposed on the LAN at `http://<your-ip>:3000`.

To rebuild after code changes:

```bash
docker compose up -d --build
```

## Workflow

1. **Configure** — Enter Archive URL, API Key, and S3 bucket details in Config
2. **Create Ingestion Points** — Define ingestion points for your archive
3. **Create Import Jobs** — Create import jobs linked to ingestion points
4. **Add Files** — Select EML files via S3 or upload directly
5. **Create Batches** — Package EML files into batches with manifest JSON
6. **Import** — Trigger the archive import process
7. **Monitor** — View batch reports and stats to track progress

## Project Structure

```
import-machine/
├── import-machine-frontend/   # React frontend
├── import-machine-backend/   # Node.js API
├── docker-compose.yml        # Full stack orchestration
├── .env.example              # Root env template
└── setup-env.ps1             # Windows setup script
```

## LAN Access

The frontend binds to `0.0.0.0:3000`, so it's accessible from other devices at `http://<your-ip>:3000` or `http://import.home.arpa:3000`. Set `FRONTEND_URL` in `.env` to your access URL (e.g. `http://import.home.arpa:3000`) for CORS.

## License

MIT
