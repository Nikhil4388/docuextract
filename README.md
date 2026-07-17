
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

[![Live Platform](https://img.shields.io/badge/🌐_LIVE-multipdfstoexcel.com-6366f1?style=for-the-badge)](https://multipdfstoexcel.com)
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

```mermaid
flowchart TD
    A["🖥️ Frontend\nReact 18 + TypeScript\nVercel Edge CDN"] -->|"HTTPS · TLS 1.3 · JWT Bearer"| B

    B["⚙️ API Gateway\nFastAPI + Uvicorn · Railway · Docker\nRate Limiting · CSP · CORS · HSTS"]

    B --> C["🔐 Auth Service\nGoogle OAuth 2.0\nbcrypt 12 rounds\nJWT HS256"]
    B --> D["⚡ Celery + Redis\nJob Engine\n50× Parallel Claude calls"]
    B --> E["🗄️ File Storage\nAWS S3 · SSE-AES256\n72-hour auto-delete"]

    D --> F["🤖 Claude Sonnet 4.6\nPDF text + Vision OCR\nJSON extraction schema"]
    D --> G["🛢️ PostgreSQL\nSupabase · SQLAlchemy\nAES-encrypted creds"]
    D --> H["📡 Redis Broker\nUpstash · TLS\nCelery task queue"]

    F --> I["📊 Excel Export\n.xlsx · openpyxl\nConfidence scores"]

    style A fill:#1e1b4b,stroke:#818cf8,color:#f1f5f9
    style B fill:#0c2233,stroke:#38bdf8,color:#f1f5f9
    style C fill:#2d1f07,stroke:#fbbf24,color:#f1f5f9
    style D fill:#1e0f3a,stroke:#c4b5fd,color:#f1f5f9
    style E fill:#052e16,stroke:#34d399,color:#f1f5f9
    style F fill:#1e0f3a,stroke:#c4b5fd,color:#f1f5f9
    style G fill:#052e16,stroke:#34d399,color:#f1f5f9
    style H fill:#3b0a0a,stroke:#fca5a5,color:#f1f5f9
    style I fill:#052e16,stroke:#34d399,color:#f1f5f9
```

### Infrastructure Overview

| Layer | Service | Region | Notes |
|---|---|---|---|
| Frontend CDN | Vercel Edge Network | Global | Auto-deploys from `main` branch |
| API Server | Railway (Docker) | US-East | Auto-scaling, zero-downtime deploys |
| Database | Supabase PostgreSQL | US-East | Managed, daily backups, SSL-only |
| Cache / Broker | Upstash Redis | US-East | TLS-enforced, Celery task queue |
| File Storage | AWS S3 | us-east-1 | SSE-AES256, IAM-restricted access |
| AI Engine | Anthropic Claude API | — | Sonnet 4.6, 50 concurrent workers |

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
                    │  • Magic-byte validation    │
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
                    │   → 72-hour deletion timer   │
                    └──────────────────────────────┘
```

---

## ◈ AUTHENTICATION FLOW

```
  User clicks "Continue with Google"
          │
          ▼
  GET /api/v1/auth/google
  ─── Backend redirects to Google OAuth consent screen ───▶ Google
                                                               │
                                                 User approves
                                                               │
  GET /api/v1/auth/google/callback ◀─────────────────────────┘
          │
          │  Backend:
          │  1. Verifies Google ID token with Google's public keys
          │  2. Creates or finds user in PostgreSQL
          │  3. Signs {access_token (60min), refresh_token (30d)}
          │     using HS256 + SECRET_KEY
          │
          ▼
  Redirect to: FRONTEND_URL/auth/callback?access_token=…&refresh_token=…
          │
          │  Frontend (AuthCallbackPage):
          │  1. Reads tokens from URL params
          │  2. access_token → JS memory (useAuthStore)
          │  3. refresh_token → localStorage
          │  4. Fetches /users/me to hydrate user profile
          │  5. navigate('/dashboard')  ← SPA navigation, no hard reload
          │
          ▼
  Dashboard ✓ (authenticated)

  ──── On page refresh ────────────────────────────────────────
  initAuth() reads refresh_token from localStorage
  → POST /api/v1/auth/refresh
  → New access_token stored in JS memory
  → User stays logged in seamlessly

  ──── On 401 (expired / revoked) ────────────────────────────
  api.ts interceptor dispatches window.Event('auth:sessionExpired')
  AuthInit listener: clearSession() + navigate('/login')
  ← No hard page reload → no infinite loop on new devices
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

| Layer | Technology | Version |
|---|---|---|
| API Framework | FastAPI + Uvicorn | 0.115 |
| Language | Python | 3.11 |
| Task Queue | Celery + Redis | 5.x |
| Database ORM | SQLAlchemy (async) + Alembic | 2.x |
| AI Engine | Anthropic Claude Sonnet 4.6 | claude-sonnet-4-6 |
| Auth | JWT HS256 + Google OAuth 2.0 | — |
| Password Hashing | bcrypt | 12 rounds |
| PDF Processing | PyMuPDF + Pillow | — |
| File Storage | AWS S3 (SSE-AES256) | boto3 |
| Security Middleware | Custom sliding-window rate limiter | — |
| Deployment | Railway (Docker container) | — |

### 🎨 Frontend

| Layer | Technology | Version |
|---|---|---|
| Framework | React + TypeScript | 18 |
| UI Library | MUI (Material UI) + DataGrid | v5 |
| Global State | Zustand | 4.x |
| Server State | TanStack React Query | v5 |
| HTTP Client | Axios + auth interceptors | — |
| Build Tool | Vite (source maps disabled) | 5.x |
| Deployment | Vercel Edge Network | — |

---

## ◈ SECURITY MODEL

This section documents every security control active in production. Also visible at [multipdfstoexcel.com/security](https://multipdfstoexcel.com/security).

---

### 1 — Authentication

```
Google OAuth 2.0 (Exclusive)
─────────────────────────────
• We use Google Sign-In only — no passwords are ever stored on our servers
  for OAuth users. Your identity is verified by Google's infrastructure.
• Google ID tokens are verified server-side using Google's public keys
  (not just trusted by the client claim).
• Future providers: Microsoft, Apple (on roadmap).

JWT Token Architecture
──────────────────────
• access_token  → stored in JS memory (Zustand store) ONLY.
                  Never in localStorage, sessionStorage, or cookies.
                  Invisible to browser extensions and XSS payloads.
                  Expires: 60 minutes.
• refresh_token → stored in localStorage for session persistence.
                  Used only to silently re-issue access tokens.
                  Expires: 30 days.
• Silent rotation: Axios interceptor queues concurrent requests during
                   token refresh, preventing race conditions.
• On 401: custom event dispatched (not window.location.href redirect)
          to avoid hard-page-reload auth loops on new devices.
```

---

### 2 — Data Lifecycle (72-Hour Auto-Delete)

```
Upload → S3 storage (AES-256 SSE)
       → Celery extraction job runs
       → Results stored in PostgreSQL
       → 72-hour deletion timer starts
       → All PDFs and raw data permanently deleted from S3 + DB
       → No backups of user documents retained beyond this window
```

- We do **not** sell, share, or analyze your documents for any other purpose.
- Deletion is automatic and unconditional — no action required from you.
- PostgreSQL result rows are pruned on the same 72-hour schedule.

---

### 3 — Encryption

```
In Transit:
  • TLS 1.3 enforced end-to-end (browser ↔ Vercel, browser ↔ Railway)
  • HSTS header: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  • Upstash Redis: TLS-only connections (no plaintext Redis)
  • Supabase PostgreSQL: SSL-only, reject if no SSL

At Rest:
  • AWS S3: SSE-S3 (AES-256) — each object encrypted with a unique key
  • PostgreSQL credentials: AES-encrypted via ENCRYPTION_KEY before storage
  • Passwords: bcrypt (12 rounds) — auto-rehash if cost factor increases
  • Google OAuth users: zero password stored (OAuth token only)
```

---

### 4 — Network & API Security

```
Rate Limiting (sliding-window per IP)
  /auth/login, /auth/register  →  10 req/min  (brute-force prevention)
  /auth/refresh                →  30 req/min
  All other API routes         → 120 req/min
  Response on breach: HTTP 429 + Retry-After header

CORS Allowlist
  • Only explicitly whitelisted origins accepted (no wildcards)
  • credentials: true with a strict origin allowlist
  • Preflight OPTIONS cached for 600 seconds

HTTP Security Headers (every response)
  Strict-Transport-Security : max-age=31536000; includeSubDomains; preload
  Content-Security-Policy   : strict domain whitelist for scripts/styles/fonts
  X-Frame-Options           : DENY  (no iframe embedding / clickjacking)
  X-Content-Type-Options    : nosniff
  Referrer-Policy           : strict-origin-when-cross-origin
  Permissions-Policy        : camera=(), microphone=(), geolocation=()
```

---

### 5 — Upload Validation

```
Every PDF upload is validated before any processing:
  ① Magic-byte check   — file header must start with %PDF-
  ② MIME type check    — Content-Type must be application/pdf
  ③ Filename sanitize  — special characters stripped, path traversal blocked
  ④ Per-file size cap  — enforced before full read to prevent memory abuse
  ⑤ S3 presigned URLs  — uploads go direct to S3, never through the API server
```

---

### 6 — Client-Side Hardening

```
Applied globally in frontend/src/main.tsx:

Right-click prevention
  document.addEventListener('contextmenu', e => e.preventDefault())

Image drag-drop prevention
  document.addEventListener('dragstart', e => { if IMG → preventDefault })

Keyboard shortcut blocking
  F12                         → blocked (DevTools)
  Ctrl/Cmd + Shift + I        → blocked (DevTools Elements)
  Ctrl/Cmd + Shift + J        → blocked (DevTools Console)
  Ctrl/Cmd + Shift + C        → blocked (DevTools Inspector)
  Ctrl/Cmd + Shift + K        → blocked (Firefox Console)
  Ctrl/Cmd + U                → blocked (View Source)
  Ctrl/Cmd + S                → blocked (Save Page)
  Ctrl/Cmd + P                → blocked (Print / DOM exposure)

Text selection disabled (CSS)
  user-select: none on body
  Re-enabled on <input>, <textarea>, [contenteditable]

DevTools size-detection (desktop only)
  outerHeight - innerHeight > 160px threshold triggers page blank + reload
  SKIPPED on mobile user agents (iOS/Android) to avoid false positives
  from browser chrome (address bar, navigation bar, keyboard)

Console warning
  Displays a prominent red "STOP" warning when DevTools console is opened,
  alerting users to social-engineering attacks.
```

---

### 7 — Session Security

```
Inactivity Auto-Logout
  • Timer resets on: mousemove, mousedown, keydown, touchstart, scroll, click
  • Fires after 60 minutes of no activity
  • Calls logout() → clears all tokens → navigate('/login')
  • Implemented in InactivityGuard component (App.tsx)

Session Expiry
  • access_token lifetime: 60 minutes (hard expiry)
  • refresh_token lifetime: 30 days
  • Both tokens cleared on explicit logout or session expiry event
```

---

### 8 — Infrastructure Security

```
Railway (Backend)
  • Docker container — no SSH access in production
  • Environment variables set via Railway dashboard only (never in code)
  • All secrets rotated immediately if accidentally exposed
  • Auto-restart on crash (Railway's built-in health check)

Vercel (Frontend)
  • VITE_API_URL is a BUILD-TIME variable baked into the bundle
  • Source maps disabled in production builds
  • SPA rewrites configured in vercel.json (no raw 404s exposing paths)
  • CSP headers applied at edge level via vercel.json headers config

AWS S3
  • Bucket is NOT public — all access via signed URLs or IAM role
  • IAM policy: least-privilege (only the actions the app needs)
  • Bucket versioning off (no old PDF versions retained)
  • Lifecycle rule: delete objects after 3 days as a hard backstop

Supabase PostgreSQL
  • SSL-only connections enforced
  • Row-level security enabled on sensitive tables
  • Daily automated backups retained for 7 days (Supabase managed)

Upstash Redis
  • TLS-only (no plaintext port exposed)
  • Used as Celery broker only — no sensitive user data stored
  • Eviction policy: noeviction for task queue integrity
```

---

### 9 — Responsible Disclosure

If you discover a security vulnerability, please email **nikhil1996shelke@gmail.com** with:

- A description of the issue
- Steps to reproduce
- Potential impact assessment

We review all reports within 48 hours and credit researchers who responsibly disclose verified vulnerabilities. Please do not publicly disclose issues before we have had a chance to address them.

---

### Security Roadmap

```
[🔮] COMING NEXT
     ├── Two-Factor Authentication (TOTP / SMS)
     ├── Microsoft + Apple Sign-In
     ├── Full audit log of all user actions
     ├── SSO / SAML for enterprise teams
     ├── SOC 2 Type II certification
     └── GDPR data residency options (EU region)
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
# create frontend/.env.local:
# VITE_API_URL=http://localhost:8000/api/v1
npm run dev                   # UI at http://localhost:3000
```

---

## ◈ ENVIRONMENT VARIABLES

### Backend (Railway Variables panel)

```env
# Database
DATABASE_URL          = postgresql+asyncpg://user:pass@host:5432/db

# Cache / Queue
REDIS_URL             = rediss://...  # note: rediss:// for TLS

# Security
SECRET_KEY            = <openssl rand -hex 32>   # JWT signing
ENCRYPTION_KEY        = <openssl rand -hex 32>   # DB credential encryption

# AI
ANTHROPIC_API_KEY     = sk-ant-...
CLAUDE_MAX_CONCURRENT = 50            # raise to 150 for enterprise tier

# Google OAuth
GOOGLE_CLIENT_ID      = ...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET  = GOCSPX-...

# URLs
FRONTEND_URL          = https://multipdfstoexcel.com
BACKEND_URL           = https://docuextract-production-xxxx.up.railway.app

# AWS S3
AWS_ACCESS_KEY_ID     = AKIA...
AWS_SECRET_ACCESS_KEY = ...
AWS_DEFAULT_REGION    = us-east-1
AWS_S3_BUCKET         = your-bucket-name
```

> ⚠️ **Never paste credentials into chat, code comments, or Git history.**
> All secrets live exclusively in Railway's Variables panel (or Vercel for frontend).
> Rotate any accidentally exposed key immediately.

### Frontend (Vercel Environment Variables)

```env
VITE_API_URL = https://docuextract-production-xxxx.up.railway.app/api/v1
```

> This is a **build-time** variable — Vercel must have it set before the build runs.
> Changing it requires a redeploy (Vercel rebuilds the bundle).

---

## ◈ PROJECT STRUCTURE

```
docuextract/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── auth.py           ← Google OAuth + JWT + login/register
│   │   │   │   ├── jobs.py           ← PDF upload, job creation, export
│   │   │   │   ├── templates.py      ← Extraction template CRUD
│   │   │   │   └── users.py          ← User profile + settings
│   │   │   └── deps.py               ← JWT auth dependency injection
│   │   ├── core/
│   │   │   ├── config.py             ← All settings (pydantic BaseSettings)
│   │   │   ├── database.py           ← Async SQLAlchemy engine + session
│   │   │   └── security.py           ← bcrypt · JWT · AES encrypt/decrypt
│   │   ├── middleware/
│   │   │   └── security.py           ← Rate limiter + security headers
│   │   ├── models/
│   │   │   ├── extraction.py         ← ExtractionJob · ExtractionResult
│   │   │   └── user.py               ← User model
│   │   ├── services/
│   │   │   ├── pdf/extractor.py      ← PyMuPDF text + vision OCR pipeline
│   │   │   └── storage/              ← S3 · GDrive · Dropbox adapters
│   │   └── tasks/
│   │       └── extraction_task.py    ← Celery parallel AI pipeline
│   └── main.py                       ← FastAPI app + middleware wiring
│
├── frontend/
│   ├── public/
│   │   ├── sitemap.xml               ← SEO sitemap
│   │   └── robots.txt                ← Search engine directives
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx       ← Marketing + SEO (JSON-LD, FAQPage)
│   │   │   ├── LoginPage.tsx         ← Google OAuth sign-in
│   │   │   ├── DashboardPage.tsx     ← Stats + recent jobs
│   │   │   ├── JobDetailPage.tsx     ← Live progress + results table
│   │   │   ├── NewJobPage.tsx        ← PDF upload wizard
│   │   │   ├── TemplatesPage.tsx     ← Template management (mobile-optimized)
│   │   │   ├── SecurityPage.tsx      ← All security protocols (public)
│   │   │   ├── PrivacyPage.tsx       ← Privacy policy
│   │   │   ├── TermsPage.tsx         ← Terms of service
│   │   │   └── ContactPage.tsx       ← Contact form
│   │   ├── components/
│   │   │   ├── layout/AppLayout.tsx  ← Sidebar + top nav
│   │   │   └── LogoIcon.tsx          ← Brand logo
│   │   ├── services/
│   │   │   └── api.ts                ← Axios + silent token refresh interceptor
│   │   ├── store/
│   │   │   └── authStore.ts          ← Zustand auth (isInitializing, clearSession)
│   │   ├── main.tsx                  ← Security hardening (DevTools, right-click)
│   │   └── App.tsx                   ← Router + AuthInit + RequireAuth guards
│   ├── index.html                    ← SEO meta · JSON-LD · OG · FAQPage schema
│   └── vercel.json                   ← CSP headers + SPA rewrites
│
└── docker-compose.yml                ← Local full-stack dev environment
```

---

## ◈ API REFERENCE

```
AUTH
  POST  /api/v1/auth/register            Register (email + password)
  POST  /api/v1/auth/login               Login → {access_token, refresh_token}
  POST  /api/v1/auth/refresh             Rotate tokens silently
  GET   /api/v1/auth/google              → Redirect to Google OAuth consent
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
  GET   /api/v1/jobs/:id                 Job status + progress %
  GET   /api/v1/jobs/:id/results         Extracted data rows (paginated)
  GET   /api/v1/jobs/:id/export/excel    Download .xlsx spreadsheet
```

All authenticated endpoints require: `Authorization: Bearer <access_token>`

---

## ◈ ROADMAP

```
[✅] SHIPPED
     ├── Google OAuth 2.0 login (no password required)
     ├── Batch PDF processing (50 concurrent Claude API calls)
     ├── S3 file storage with SSE-AES256 encryption
     ├── Custom extraction templates (any field, any document)
     ├── Excel export with per-field confidence scores
     ├── bcrypt 12-round password hashing + JWT rotation
     ├── Sliding-window rate limiting + full security headers
     ├── 72-hour automatic data deletion
     ├── Inactivity auto-logout (60 min)
     ├── Client-side DevTools + right-click + keyboard hardening
     ├── Mobile-responsive portal (template dialog, PDF canvas)
     ├── Auth infinite-loop fix (event-based session expiry)
     ├── Security page (/security) with all protocols documented
     └── DB connection resilience (retry on SSL drop)

[🔮] COMING NEXT
     ├── Two-Factor Authentication (TOTP)
     ├── Microsoft + Apple Sign-In
     ├── Full audit log of all user actions
     ├── SSO / SAML for enterprise teams
     ├── SOC 2 Type II certification
     ├── GDPR data residency options (EU region)
     ├── Webhook notifications (job complete → POST your URL)
     ├── Headless API key (programmatic access)
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

[![Try It Free](https://img.shields.io/badge/▶_TRY_IT_FREE-multipdfstoexcel.com-6366f1?style=for-the-badge)](https://multipdfstoexcel.com)

</div>
