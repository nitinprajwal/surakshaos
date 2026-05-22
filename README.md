<div align="center">

<img src="public/logo.png" alt="Suraksha OS Logo" width="80" height="80" />

# SURAKSHA OS

### AI-Powered Regulatory Compliance Operating System

[![Next.js](https://img.shields.io/badge/Next.js-16.2.4-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

**Suraksha** (सुरक्षा) means *"protection"* in Sanskrit.

> An autonomous, AI-driven platform that transforms raw regulatory PDFs into tracked obligations, evidence vaults, risk scores, and board-ready compliance reports — in real time.

[Live Demo](https://surakshaos.nitinr.me) · [Report Bug](https://github.com/nitinprajwal/surakshaos/issues) · [Request Feature](https://github.com/nitinprajwal/surakshaos/issues)

</div>

---

## 📋 Table of Contents

- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Screenshots](#-screenshots)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the App](#running-the-app)
- [Database Setup](#-database-setup)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 About the Project

Suraksha OS was built to solve a critical problem faced by every Indian financial institution: **regulatory overload**.

RBI alone issues 200–400 circulars per year. Each circular contains dozens of binding obligations buried in dense legal language. Compliance teams spend weeks manually extracting requirements, assigning tasks, collecting evidence, and preparing for audits — a process that is slow, error-prone, and opaque.

**Suraksha OS changes all of that.**

Upload a regulatory PDF → the AI extracts every compliance obligation in seconds → assigns tasks to departments → tracks evidence → computes risk scores → and generates board-ready compliance reports. All from a single, unified platform.

```
Regulatory Circular (PDF)
        ↓
  AI Text Extraction (LiteLLM proxy · or · local Ollama)
        ↓
  Obligations Parsed & Classified
        ↓
  MAP Cards Created & Assigned
        ↓
  Evidence Collected & Validated
        ↓
  Readiness Scores Computed (Live)
        ↓
  Board-Ready Compliance Report
```

### Who is it for?

- **Banks & NBFCs** regulated by RBI
- **Capital market intermediaries** regulated by SEBI
- **Insurance companies** regulated by IRDAI
- **Any organization** operating under multi-regulator compliance frameworks

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 📄 **Document Intake & AI Extraction** | Upload PDFs → LiteLLM proxy (or local Ollama fallback) extracts obligations with title, department, priority, due date, and confidence score |
| 📋 **Obligations Repository** | Full CRUD registry of all compliance obligations with status tracking and department filtering |
| 🗂️ **MAP Board** | Kanban-style Mitigation Action Plan board — link tasks directly to obligations |
| 🔍 **Evidence Management** | Per-obligation evidence vaults with AI gap detection and collection tracking |
| 🕸️ **Knowledge Graph** | Interactive force-directed graph mapping document → regulation → obligation → department relationships |
| 📈 **Regulatory Drift Analysis** | Jaccard similarity engine that compares document versions and quantifies regulatory change |
| 🎯 **Department Readiness Scoring** | Live algorithmic scores (0–100) computed from real obligation and evidence data |
| ⚡ **Impact Simulation** | "What-if" analysis — simulate the operational impact of a new regulation before it becomes binding |
| 📊 **Risk Analytics** | 12-month compliance trend charts, per-department risk heatmap |
| 📝 **Compliance Reports** | One-click printable reports from live Supabase data |
| 🔒 **Immutable Audit Trail** | Every action logged with actor, timestamp, severity, and metadata |
| 🔔 **Real-time Notifications** | Supabase realtime-powered alerts for deadline breaches, escalations, and status changes |
| 🖥️ **Executive Dashboard** | KPI overview powered by a single PostgreSQL RPC function |
| ⚙️ **Settings** | Organization identity, risk thresholds, notification preferences |

---

## 🛠️ Tech Stack

### Frontend
- **[Next.js 16.2.4](https://nextjs.org)** — App Router, React Server Components, API Routes
- **[React 19](https://react.dev)** — Latest concurrent features
- **[TypeScript 5](https://www.typescriptlang.org)** — Strict type safety end-to-end
- **[Tailwind CSS v4](https://tailwindcss.com)** — Utility-first styling
- **[Framer Motion](https://www.framer.com/motion)** — Page transitions and micro-interactions
- **[Recharts](https://recharts.org)** — Analytics charts (bar, area, pie)
- **[@xyflow/react](https://reactflow.dev)** — Interactive knowledge graph visualization
- **[Lucide React](https://lucide.dev)** — Icon system
- **[Sonner](https://sonner.emilkowal.ski)** — Toast notifications

### Backend & Data
- **[Supabase](https://supabase.com)** — PostgreSQL database, Storage, Realtime, Row-Level Security
- **[PL/pgSQL Functions](https://www.postgresql.org/docs/current/plpgsql.html)** — `get_dashboard_kpis()`, `get_analytics_overview()`, `increment_evidence_count()`, etc.
- **Database Triggers** — Auto `updated_at` maintenance on all mutable tables

### AI & Intelligence
- **[LiteLLM](https://litellm.ai)** proxy at `https://litellm.nitinr.me` — OpenAI-compatible gateway (primary when `OPENAI_BASE_URL` + `OPENAI_API_KEY` are set)
- **[Ollama](https://ollama.com)** (local) — offline LLM fallback (`qwen2.5:1.5b` / `llama3.1`) when LiteLLM is not configured
- **[pdf-parse](https://www.npmjs.com/package/pdf-parse)** — PDF text extraction
- **Jaccard Similarity** — Regulatory drift detection algorithm
- **[OpenAI SDK v6](https://github.com/openai/openai-node)** — Used to talk to the LiteLLM proxy

### State & Utilities
- **[Zustand](https://zustand-demo.pmnd.rs)** — Global state management
- **[date-fns](https://date-fns.org)** — Date formatting and calculation
- **Turbopack** — Fast development bundler

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                         │
│  Next.js App Router  │  React 19  │  Tailwind v4  │  Framer  │
├──────────────────────────────────────────────────────────────┤
│                      API LAYER                               │
│      Next.js Route Handlers  │  REST  │  Streaming           │
├──────────────────────────────────────────────────────────────┤
│                      AI LAYER                                │
│   Ollama (local LLM)  │  pdf-parse  │  Jaccard Similarity   │
├──────────────────────────────────────────────────────────────┤
│                    DATA LAYER                                │
│  Supabase PostgreSQL  │  Storage  │  Realtime  │  RLS        │
│           15 Tables  │  6 Enums  │  11 Functions             │
└──────────────────────────────────────────────────────────────┘
```

### Database Schema (15 Tables)

| Table | Purpose |
|---|---|
| `obligations` | Core compliance obligations with status, priority, owner, evidence count |
| `documents` | Uploaded regulatory documents with processing metadata |
| `map_cards` | Kanban tasks linked to obligations |
| `evidence` | Per-obligation proof items |
| `audit_trail` | Immutable action log |
| `notifications` | Real-time alerts and escalation notices |
| `risk_scores` | Per-department risk scores with trend direction |
| `compliance_trends` | 12-month historical compliance score data |
| `readiness_scores` | Computed department readiness with recommendations |
| `drift_comparisons` | Jaccard similarity results between document versions |
| `impact_simulations` | What-if regulatory impact analysis results |
| `graph_relationships` | Typed edges for knowledge graph |
| `escalations` | Formal escalation records |
| `regulatory_versions` | Regulation version history |
| `departments` | Department registry with risk tier |

---

## 📸 Screenshots

> *Coming soon — screenshots of the live platform*

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | ≥ 18.x | [Download](https://nodejs.org) |
| npm | ≥ 9.x | Comes with Node.js |
| LiteLLM proxy | — | `OPENAI_BASE_URL=https://litellm.nitinr.me` — no local install needed |
| Ollama | Latest | [Download](https://ollama.com/download) — only needed if LiteLLM is not configured |
| Supabase account | — | [Free tier](https://supabase.com) works perfectly |

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/nitinprajwal/surakshaos.git
cd surakshaos
```

**2. Install dependencies**

```bash
npm install
```

**3. Pull the AI model** (for obligation extraction)

```bash
# Lightweight, fast on CPU (~986MB)
ollama pull qwen2.5:1.5b

# Or for better quality on GPU
ollama pull llama3.1
```

### Environment Variables

Copy the example environment file and fill in your Supabase and AI credentials:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
# Supabase — get these from your Supabase project dashboard
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-public-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-secret-key>
SUPABASE_PROJECT_ID=<your-project-id>

# Storage bucket name (create this in Supabase Storage)
NEXT_PUBLIC_SUPABASE_DOCUMENTS_BUCKET=compliance-documents

# Ollama — local LLM (no API key needed)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:1.5b

# OpenAI-compatible fallback via LiteLLM proxy
OPENAI_BASE_URL=https://litellm.nitinr.me
OPENAI_API_KEY=<your-proxy-api-key>

# Set to 2 for quick testing, 0 for full document extraction
OLLAMA_MAX_CHUNKS=2
```

> **Where to find Supabase keys:**
> 1. Go to [supabase.com](https://supabase.com) → Your Project
> 2. Settings → API
> 3. Copy the **URL**, **anon public** key, and **service_role secret** key

> **LiteLLM/OpenAI-compatible endpoint:**
> - Point `OPENAI_BASE_URL` at `https://litellm.nitinr.me`
> - Use your proxy/API key in `OPENAI_API_KEY`
> - The OpenAI SDK can then talk to this endpoint without code changes

### Running the App

**Start the development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You'll be redirected to the dashboard.

**Build for production:**

```bash
npm run build
npm start
```

---

## 🗄️ Database Setup

The project includes 6 migration files in `supabase/migrations/`. Run them in order from your Supabase SQL Editor:

```
supabase/migrations/
├── 001_core_schema.sql          # Tables, enums, indexes, base RLS
├── 002_extended_schema.sql      # Extended columns for obligations & map_cards
├── 003_advanced_tables.sql      # Knowledge graph, drift, readiness, impact tables
├── 004_stored_functions.sql     # get_dashboard_kpis(), get_recent_activity(), etc.
├── 005_seed_data.sql            # Initial obligations, compliance trends, risk scores
└── 006_complete_alignment.sql   # Final alignment: functions, triggers, RLS, realtime
```

**How to run migrations:**

1. Open your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **SQL Editor**
3. Open each file and run them in order (001 → 006)

**Or use the built-in migration runner:**

Start the dev server and visit:

```
POST http://localhost:3000/api/admin/migrate
```

This will run all pending migrations automatically.

---

## 📁 Project Structure

```
surakshaos/
├── app/                          # Next.js App Router
│   ├── api/                      # API Route Handlers
│   │   ├── upload-document/      # PDF upload → Supabase Storage
│   │   ├── extract-obligations/  # LLM obligation extraction pipeline
│   │   ├── obligations/          # CRUD + GET with filters
│   │   ├── map-cards/            # Kanban card CRUD
│   │   ├── evidence/             # Evidence vault CRUD
│   │   ├── notifications/        # Real-time notification CRUD
│   │   ├── knowledge-graph/      # Graph nodes & edges
│   │   ├── readiness/            # Live readiness score computation
│   │   ├── drift/                # Jaccard similarity comparison
│   │   ├── impact/               # Impact simulation
│   │   ├── evidence-intelligence/# AI gap detection
│   │   └── admin/migrate/        # Migration runner
│   ├── dashboard/                # Executive KPI dashboard
│   ├── upload/                   # Document upload & AI extraction
│   ├── documents/                # Document library
│   ├── obligations/              # Obligations registry
│   ├── map-board/                # Kanban MAP board
│   ├── knowledge-graph/          # Interactive force graph
│   ├── drift/                    # Regulatory drift analysis
│   ├── readiness/                # Department readiness scores
│   ├── evidence/                 # Evidence management
│   ├── impact/                   # Impact simulation
│   ├── audit/                    # Audit trail
│   ├── analytics/                # Risk analytics & charts
│   ├── reports/                  # Printable compliance reports
│   └── settings/                 # Organization settings
├── components/                   # Shared React components
├── lib/
│   ├── supabase/                 # Supabase client factories (server + browser)
│   └── services/                 # Business logic services
├── hooks/                        # Custom React hooks
├── types/                        # TypeScript type definitions
├── supabase/migrations/          # SQL migration files (001–006)
├── public/                       # Static assets
└── .env.local.example            # Environment variable template
```

---

## 📡 API Reference

| Endpoint | Methods | Description |
|---|---|---|
| `/api/upload-document` | `POST` | Upload PDF to Supabase Storage |
| `/api/extract-obligations` | `POST` | Run LLM obligation extraction |
| `/api/obligations` | `GET` `POST` | List (filter by dept/status) / Create |
| `/api/obligations/[id]` | `GET` `PUT` `DELETE` | Single obligation CRUD |
| `/api/map-cards` | `GET` `POST` | List / Create MAP cards |
| `/api/map-cards/[id]` | `PUT` `DELETE` | Update / Delete MAP card |
| `/api/evidence` | `GET` `POST` `PUT` | List / Create / Mark collected |
| `/api/notifications` | `GET` `POST` `PATCH` | List / Create / Mark all read |
| `/api/documents` | `GET` | List all uploaded documents |
| `/api/knowledge-graph` | `GET` | Fetch graph nodes & edges |
| `/api/readiness` | `GET` | Compute live department readiness |
| `/api/drift` | `GET` `POST` | List / Run drift comparison |
| `/api/impact` | `GET` `POST` | List / Run impact simulation |
| `/api/evidence-intelligence` | `GET` | AI-driven evidence gap analysis |
| `/api/admin/migrate` | `GET` `POST` | Check table status / Run migrations |

---

## 🗺️ Roadmap

The current platform is **v0.1.0**. Here are 12 advanced features planned for future releases:

- [ ] **Self-Evolving Compliance Memory** — pgvector embeddings that learn from past obligation outcomes
- [ ] **Compliance Digital Twin** — Virtual simulation of the entire organization's compliance posture
- [ ] **AI Compliance Negotiation Engine** — Auto-generate board briefings, audit responses, regulatory letters
- [ ] **Regulatory Future Prediction** — AI prediction of upcoming regulatory requirements (6–18 month horizon)
- [ ] **Autonomous Compliance Agents** — 6 specialized AI agents (Policy, Risk, Audit, Escalation, Drift, Evidence)
- [ ] **Compliance Graph Brain** — Semantic reasoning over the knowledge graph to find hidden dependencies
- [ ] **Live Regulatory Monitoring** — Auto-scrape RBI, SEBI, CERT-In for new publications
- [ ] **AI Explainability Engine** — Show *why* each obligation was extracted and *why* a risk was assigned
- [ ] **AI Risk Cascade Engine** — Map how one compliance gap triggers downstream failures
- [ ] **Evidence Validation AI** — Verify that uploaded proof actually satisfies the obligation semantically
- [ ] **Boardroom AI** — One-click executive intelligence packs for board meetings
- [ ] **Autonomous Compliance OS** — Full self-operating compliance loop with minimal human intervention

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the project
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

Please make sure to:
- Follow the existing TypeScript coding style
- Use `service_role` client only in API routes (never in browser components)
- Run `npm run build` before submitting to ensure no type errors
- Never commit `.env.local` or any file with real credentials

---

## 🔐 Security

- All Supabase credentials are in `.env.local` (excluded from git via `.gitignore`)
- Row-Level Security (RLS) is enabled on all 15 database tables
- The `service_role` key is used only in server-side API routes
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser — it bypasses all RLS

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 🙏 Acknowledgements

- [Supabase](https://supabase.com) — The open-source Firebase alternative
- [Ollama](https://ollama.com) — Run LLMs locally with zero cost
- [Next.js](https://nextjs.org) — The React framework for production
- [Shadcn/ui](https://ui.shadcn.com) — Beautiful accessible component primitives
- [React Flow](https://reactflow.dev) — Knowledge graph visualization

---

<div align="center">
  <strong>Built with ❤️ for India's Compliance Teams</strong><br/>
  <sub>Suraksha OS — Protecting organizations through intelligent compliance</sub>
</div>

## Deploy on Vercel

The app is currently configured to run behind the local domain-management/Nginx setup at:

- `https://surakshaos.nitinr.me`
- local upstream: `http://127.0.0.1:3003`

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
