# DocuExtract — AI-Powered PDF Data Extraction Platform

Extract structured data from hundreds of PDFs in parallel using OCR and LLMs.

---

## Architecture

```
┌──────────────┐    ┌───────────────┐    ┌───────────────┐
│   React/TS   │───▶│  FastAPI      │───▶│  PostgreSQL   │
│   Frontend   │    │  Backend      │    │  Database     │
│   (Vite/MUI) │    │  (Python 3.11)│    └───────────────┘
└──────────────┘    │               │
                    │               │───▶┌───────────────┐
                    └───────────────┘    │  Redis Cache  │
                            │            │  + Celery Broker│
                            ▼            └───────────────┘
                    ┌───────────────┐
                    │  Celery       │
                    │  Workers (8)  │
                    │  PDF + OCR    │
                    │  LLM Extract  │
                    └───────────────┘
```

## Quick Start (Docker)

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env — set SECRET_KEY, ANTHROPIC_API_KEY at minimum

# 2. Start all services
docker compose up -d

# 3. Open the app
open http://localhost:3000
```

Services started:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000/api/docs
- **Flower** (job monitor): http://localhost:5555

---

## Local Development

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Start Postgres + Redis via Docker
docker compose up postgres redis -d

# Run migrations
alembic upgrade head

# Start API server
uvicorn main:app --reload --port 8000
```

### Celery Worker (separate terminal)

```bash
cd backend
celery -A app.tasks.celery_app worker -Q extraction -c 4 --loglevel=info
```

### Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:3000
```

---

## Features

| Feature | Status |
|---------|--------|
| Email/password auth | ✅ |
| Google OAuth | ✅ |
| Microsoft OAuth | ✅ |
| PDF upload + AI column detection | ✅ |
| Column template management | ✅ |
| AWS S3 / Google Drive / Dropbox | ✅ |
| Claude + OpenAI LLM extraction | ✅ |
| Parallel processing (Celery + ThreadPool) | ✅ |
| OCR fallback (Tesseract) | ✅ |
| Excel export | ✅ |
| Real-time job progress | ✅ |
| Role-based access control | ✅ |
| API key encryption at rest | ✅ |
| Audit logging | ✅ |
| Docker + GitHub Actions CI/CD | ✅ |

---

## Environment Variables

See `.env.example` for all required variables.

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | ✅ | JWT signing key |
| `POSTGRES_PASSWORD` | ✅ | Database password |
| `ANTHROPIC_API_KEY` | ✅ | Default Claude key |
| `OPENAI_API_KEY` | ⬜ | For OpenAI option |
| `GOOGLE_CLIENT_ID/SECRET` | ⬜ | Google OAuth |

---

## API Reference

Full interactive docs at `/api/docs` (Swagger UI).

Key endpoints:

```
POST /api/v1/auth/login          Login
POST /api/v1/auth/register       Register
GET  /api/v1/auth/google         Google OAuth redirect

GET  /api/v1/templates/          List templates
POST /api/v1/templates/          Create template
POST /api/v1/templates/upload-sample  AI column detection

POST /api/v1/jobs/               Create extraction job
GET  /api/v1/jobs/{id}/results   Get results (paginated)
GET  /api/v1/jobs/{id}/export/excel  Download Excel
```

---

## Scaling to 1000+ Files

The platform uses a Celery task queue with up to 16 concurrent threads per worker. To scale:

1. Increase `celery_worker` replicas in docker-compose or Kubernetes
2. Scale Celery concurrency: `-c 32` for large instances
3. For 10,000+ files, swap `ThreadPoolExecutor` in `extraction_task.py` for the included PySpark runner (`app/services/pdf/spark_runner.py`)

---

## Security

- Passwords hashed with bcrypt
- JWT tokens with refresh rotation
- API keys encrypted at rest (Fernet/AES-256)
- HTTPS enforced in nginx config
- Rate limiting: 30 req/s per IP on API
- Audit log on all destructive operations
# docuextract
# docuextract
