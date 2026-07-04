
<div align="center">

```
███╗   ███╗██╗   ██╗██╗  ████████╗██╗██████╗ ██████╗ ███████╗
████╗ ████║██║   ██║██║  ╚══██╔══╝██║██╔══██╗██╔══██╗██╔════╝
██╔████╔██║██║   ██║██║     ██║   ██║██████╔╝██║  ██║█████╗  
██║╚██╔╝██║██║   ██║██║     ██║   ██║██╔═══╝ ██║  ██║██╔══╝  
██║ ╚═╝ ██║╚██████╔╝███████╗██║   ██║██║     ██████╔╝██║     
╚═╝     ╚═╝ ╚═════╝ ╚══════╝╚═╝   ╚═╝╚═╝     ╚═════╝ ╚═╝     
```

### ⚡ AI-POWERED · BATCH PDF EXTRACTION · ZERO MANUAL WORK ⚡

[![Live Platform](https://img.shields.io/badge/🌐_LIVE-docuextract--ashen.vercel.app-6366f1?style=for-the-badge)](https://docuextract-ashen.vercel.app)
[![AI Engine](https://img.shields.io/badge/🤖_AI-Claude_Sonnet_4.6-8b5cf6?style=for-the-badge)](https://anthropic.com)
[![Backend](https://img.shields.io/badge/⚙️_API-FastAPI_+_Railway-06b6d4?style=for-the-badge)](https://railway.app)
[![Frontend](https://img.shields.io/badge/🎨_UI-React_+_Vercel-10b981?style=for-the-badge)](https://vercel.com)
[![License](https://img.shields.io/badge/📜_LICENSE-MIT-f59e0b?style=for-the-badge)](LICENSE)

```
◆━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━◆
  Upload 100 PDFs → AI reads every page → Download Excel
               [ All in under 2 minutes ]
◆━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━◆
```

</div>

---

## ◈ WHAT IS THIS?

**MultiPDFToExcel** is a next-generation AI document intelligence platform that eliminates manual data entry from PDFs. Point it at any folder of PDFs — invoices, resumes, contracts, bank statements, medical records — define what fields you want, and receive a perfectly structured Excel spreadsheet in seconds.

No OCR setup. No templates to train. No code to write. Just upload and extract.

---

## ◈ SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT  (Browser)                            │
│   React 18 · TypeScript · MUI · TanStack Query · Vite          │
│   Hosted: Vercel Edge Network (Global CDN)                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │  HTTPS / JWT Bearer Token
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY  (Railway)                        │
│   FastAPI · Uvicorn · Python 3.11                               │
│   Auth: JWT access/refresh + Google OAuth 2.0                  │
│   Security: bcrypt · rate limiting · CSP · CORS · HSTS         │
└────────┬─────────────────┬────────────────────┬────────────────┘
         │                 │                    │
         ▼                 ▼                    ▼
┌──────────────┐  ┌─────────────────┐  ┌──────────────────┐
│  PostgreSQL  │  │  Celery Worker  │  │   File Storage   │
│  (Supabase)  │  │  + Redis Broker │  │   AWS S3 / GDrive│
│              │  │                 │  │   / Dropbox      │
│  Users       │  │  ┌───────────┐  │  │                  │
│  Jobs        │  │  │  Claude   │  │  │  PDF Upload      │
│  Templates   │  │  │ Sonnet4.6 │  │  │  Temp Processing │
│  Results     │  │  │  50x↕️    │  │  │  Auto-cleanup    │
└──────────────┘  │  └───────────┘  │  └──────────────────┘
                  └─────────────────┘
```

---

## ◈ PDF EXTRACTION PIPELINE

```
  ┌──────────┐    ┌──────────┐    ┌────────────────────────────┐
  │  Upload  │───▶│   S3     │───▶│  Celery Task Dispatcher    │
  │  PDFs    │    │ Storage  │    │  (Redis Message Broker)    │
  └──────────┘    └──────────┘    └──────────────┬─────────────┘
                                                 │ Fan-out
                  ┌──────────────────────────────┤ (50 concurrent)
                  ▼          ▼          ▼        ▼
              ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐
              │ PDF₁ │  │ PDF₂ │  │ PDF₃ │  │ PDF… │
              └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘
                 └──────────┴─────────┴──────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │       PDF Extractor         │
                    │  • Native text extraction   │
                    │  • Vision OCR (scanned)     │
                    │  • Page-level image scan    │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────▼───────────────┐
                    │     Claude Sonnet 4.6        │
                    │                             │
                    │  "Extract ONLY:             │
                    │   [your custom template]"   │
                    │                             │
                    │  Returns JSON:              │
                    │  {                          │
                    │   extracted_data: {         │
                    │     invoice_no: "INV-001",  │
                    │     vendor: "Acme Corp",    │
                    │     total: "$4,250.00"      │
                    │   },                        │
                    │   confidence_scores: {      │
                    │     invoice_no: 0.99,       │
                    │     vendor: 0.97,           │
                    │     total: 0.98             │
                    │   }                         │
                    │  }                          │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────▼───────────────┐
                    │   Results Aggregator         │
                    │   → PostgreSQL storage       │
                    │   → Excel .xlsx export       │
                    └──────────────────────────────┘
```

---

## ◈ PERFORMANCE

```
┌──────────────┬─────────────┬──────────────┬───────────────────┐
│  File Count  │  Time       │  Throughput  │  Concurrency      │
├──────────────┼─────────────┼──────────────┼───────────────────┤
│   10  PDFs   │  ~8 sec     │  1.2/sec     │  10 parallel      │
│   50  PDFs   │  ~12 sec    │  4.1/sec     │  50 parallel      │
│   100 PDFs   │  ~22 sec    │  4.5/sec     │  50 parallel      │
│   500 PDFs   │  ~2 min     │  4.2/sec     │  50 parallel      │
│  1000 PDFs   │  ~4 min     │  4.4/sec     │  50 parallel*     │
└──────────────┴─────────────┴──────────────┴───────────────────┘
  * Set CLAUDE_MAX_CONCURRENT=150 for Anthropic enterprise tier
  * Extraction accuracy: 95%+ on structured documents
  * Confidence scores shown per field on every result
```

---

## ◈ TECH STACK

### 🔮 Backend
| Layer | Technology |
|---|---|
| API Framework | FastAPI + Uvicorn |
| Language | Python 3.11 |
| Task Queue | Celery 5 + Redis |
| Database ORM | SQLAlchemy (async) + Alembic migrations |
| AI Engine | Anthropic Claude Sonnet 4.6 |
| Auth | JWT (access + refresh tokens) + Google OAuth 2.0 |
| Password Hashing | bcrypt (12 rounds) |
| File Storage | AWS S3 + Google Drive + Dropbox |
| PDF Processing | PyMuPDF + Pillow (vision OCR) |
| Security | Sliding-window rate limiting · HSTS · CSP · CORS |
| Deployment | Railway (Docker container) |

### 🎨 Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| UI Library | MUI (Material UI) v5 + DataGrid |
| Global State | Zustand |
| Server State | TanStack React Query v5 |
| HTTP Client | Axios + auth interceptors |
| Build Tool | Vite (source maps disabled in prod) |
| Deployment | Vercel Edge Network |

---

## ◈ SECURITY MODEL

```
┌─────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                            │
│                                                                 │
│  ① JWT Token Strategy                                           │
│     Access token  → JS memory only (never localStorage)        │
│     Refresh token → localStorage (session restore only)        │
│     Expiry: 60 min access · 30 day refresh                     │
│     Auto-refresh: silent token rotation via interceptor        │
│                                                                 │
│  ② Rate Limiting (sliding window per IP)                        │
│     /auth/login, /register  → 10 requests/minute              │
│     All other API routes    → 120 requests/minute              │
│     429 + Retry-After header returned on breach                │
│                                                                 │
│  ③ HTTP Security Headers                                        │
│     Strict-Transport-Security: max-age=31536000; preload       │
│     Content-Security-Policy: strict domain whitelist           │
│     X-Frame-Options: DENY (no iframe embedding)                │
│     X-Content-Type-Options: nosniff                            │
│                                                                 │
│  ④ PDF Upload Validation                                        │
│     Magic bytes check: file must start with %PDF-              │
│     Filename sanitization: strip special characters            │
│     Per-file size limit enforced before full read              │
│                                                                 │
│  ⑤ Password Security                                            │
│     bcrypt with 12 rounds (industry standard)                  │
│     Automatic rehash on login if cost factor increases         │
│     Google OAuth users: no password stored                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## ◈ QUICK START

### Prerequisites
```
Python 3.11+  ·  Node 18+  ·  PostgreSQL  ·  Redis  ·  AWS S3 bucket
```

### 1 — Clone & configure
```bash
git clone https://github.com/Nikhil4388/docuextract.git
cd docuextract
cp "env.example copy.textClipping" .env    # fill in all values
```

### 2 — Backend
```bash
cd backend
pip install -r requirements.txt
alembic upgrade head          # run DB migrations
uvicorn main:app --reload     # API at http://localhost:8000
```

### 3 — Celery worker (new terminal)
```bash
cd backend
celery -A app.tasks.celery_app worker -Q extraction --loglevel=info
```

### 4 — Frontend
```bash
cd frontend
npm install
# set VITE_API_URL=http://localhost:8000/api/v1 in .env.local
npm run dev                   # UI at http://localhost:3000
```

---

## ◈ ENVIRONMENT VARIABLES

### Backend (Railway)
```env
DATABASE_URL          = postgresql+asyncpg://...
REDIS_URL             = redis://...
SECRET_KEY            = <openssl rand -hex 32>
ENCRYPTION_KEY        = <openssl rand -hex 32>
ANTHROPIC_API_KEY     = sk-ant-...
GOOGLE_CLIENT_ID      = ...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET  = ...
FRONTEND_URL          = https://your-domain.com
BACKEND_URL           = https://your-api.railway.app
AWS_ACCESS_KEY_ID     = ...
AWS_SECRET_ACCESS_KEY = ...
AWS_DEFAULT_REGION    = us-east-1
AWS_S3_BUCKET         = your-bucket-name
CLAUDE_MAX_CONCURRENT = 50        # raise for enterprise Anthropic tiers
```

### Frontend (Vercel)
```env
VITE_API_URL = https://your-api.railway.app/api/v1
```

---

## ◈ PROJECT STRUCTURE

```
docuextract/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── auth.py         ← Google OAuth + JWT + login/register
│   │   │   │   ├── jobs.py         ← PDF upload, job creation, export
│   │   │   │   ├── templates.py    ← Extraction template CRUD
│   │   │   │   └── users.py        ← User profile + settings
│   │   │   └── deps.py             ← JWT auth dependency injection
│   │   ├── core/
│   │   │   ├── config.py           ← All settings (pydantic BaseSettings)
│   │   │   ├── database.py         ← Async SQLAlchemy engine + session
│   │   │   └── security.py         ← bcrypt · JWT · encrypt/decrypt
│   │   ├── middleware/
│   │   │   └── security.py         ← Rate limiter + security headers
│   │   ├── models/
│   │   │   ├── extraction.py       ← ExtractionJob · ExtractionResult
│   │   │   └── user.py             ← User model
│   │   ├── services/
│   │   │   ├── pdf/extractor.py    ← PyMuPDF text + vision OCR pipeline
│   │   │   └── storage/            ← S3 · GDrive · Dropbox adapters
│   │   └── tasks/
│   │       └── extraction_task.py  ← Celery parallel AI pipeline
│   └── main.py                     ← FastAPI app + middleware wiring
│
├── frontend/
│   ├── public/
│   │   ├── sitemap.xml             ← SEO sitemap
│   │   └── robots.txt              ← Search engine directives
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx     ← Marketing + SEO (JSON-LD, FAQPage)
│   │   │   ├── DashboardPage.tsx   ← Stats + recent jobs
│   │   │   ├── JobDetailPage.tsx   ← Live progress + results table
│   │   │   ├── NewJobPage.tsx      ← PDF upload wizard
│   │   │   └── TemplatesPage.tsx   ← Template management
│   │   ├── services/api.ts         ← Axios + silent token refresh
│   │   ├── store/authStore.ts      ← Zustand auth (isInitializing state)
│   │   └── App.tsx                 ← Router + AuthInit + RequireAuth
│   ├── index.html                  ← SEO meta · JSON-LD · OG · FAQPage
│   └── vercel.json                 ← CSP headers + SPA rewrites
│
└── docker-compose.yml              ← Local full-stack dev environment
```

---

## ◈ API REFERENCE

```
AUTH
  POST  /api/v1/auth/register            Register (email + password)
  POST  /api/v1/auth/login               Login → {access_token, refresh_token}
  POST  /api/v1/auth/refresh             Rotate tokens silently
  GET   /api/v1/auth/google              → Redirect to Google OAuth
  GET   /api/v1/auth/google/callback     OAuth callback → redirect + tokens

USERS
  GET   /api/v1/users/me                 Current user profile

TEMPLATES
  GET   /api/v1/templates/               List extraction templates
  POST  /api/v1/templates/               Create template
  PUT   /api/v1/templates/:id            Update template
  DEL   /api/v1/templates/:id            Delete template

JOBS
  POST  /api/v1/jobs/upload-files        Upload PDFs to S3 → file keys
  POST  /api/v1/jobs/                    Create & queue extraction job
  GET   /api/v1/jobs/                    List all jobs
  GET   /api/v1/jobs/:id                 Job status + progress
  GET   /api/v1/jobs/:id/results         Extracted data rows
  GET   /api/v1/jobs/:id/export/excel    Download .xlsx spreadsheet
```

---

## ◈ ROADMAP

```
[✅] SHIPPED
     ├── Google OAuth 2.0 login (no password required)
     ├── Batch PDF processing (50 concurrent Claude API calls)
     ├── S3, Google Drive, Dropbox storage adapters
     ├── Custom extraction templates (any field, any document)
     ├── Excel export with confidence scores
     ├── bcrypt passwords + JWT access/refresh token rotation
     ├── Sliding-window rate limiting + security headers
     ├── Inactivity auto-logout (60 min)
     ├── Billing error detection + user-friendly messages
     └── DB connection resilience (retry on SSL drop)

[🔮] COMING NEXT
     ├── Custom domain → SEO ranking for "pdf to excel"
     ├── Webhook notifications (job complete → POST your URL)
     ├── Headless API key (use without logging in)
     ├── CSV + JSON export options
     ├── PDF table detection (preserve table structure)
     ├── Multi-language PDF support
     └── Team workspaces + shared templates
```

---

## ◈ LICENSE

MIT © 2026 MultiPDFToExcel — Free to use, modify, and distribute.

---

<div align="center">

```
◆━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━◆
         Built with ⚡ FastAPI · React · Claude AI
◆━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━◆
```

[![Try It Free](https://img.shields.io/badge/▶_TRY_IT_FREE-docuextract--ashen.vercel.app-6366f1?style=for-the-badge)](https://docuextract-ashen.vercel.app)

</div>
