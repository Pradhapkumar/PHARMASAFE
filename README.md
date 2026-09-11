# PharmaSafe Intelligence
## AI-Powered Pharmaceutical Reverse Chain & Medicine Safety Platform

> **"We don't just detect expired medicines. We create a closed-loop system that tracks the batch, controls its return, verifies destruction, and detects possible re-entry into the market."**

---

## 1. System Overview

PharmaSafe Intelligence is a comprehensive pharmaceutical integrity platform engineered to eradicate counterfeit medicines, unauthorized re-entry of expired/recalled stock, and untracked reverse supply chain leakage.

### Closed-Loop Traceability Lifecycle

```
MANUFACTURER ──► DISTRIBUTOR ──► PHARMACY ──► PATIENT / SALE
                                    │
                                (Expiry / Recall / Suspicion)
                                    ▼
MANUFACTURER ◄── DISTRIBUTOR ◄── RETURN (Reverse Logistics)
      │
      ▼
AUTHORIZED DISPOSAL FACILITY ──► DESTRUCTION ──► DESTRUCTION CERTIFICATE (SHA-256)
                                                        │
                                                        ▼
RE-ENTRY MONITORING ◄─────── DEAD BATCH REGISTRY ◄──────┘
(Scans & Online Listings)
```

---

## 2. Team Architecture & Ownership Matrix

PharmaSafe is designed for parallel development across four specialized engineering domains:

| Role | Engineer | Focus Area | Key Responsibilities & Deliverables |
| :--- | :--- | :--- | :--- |
| **Member 1** | **Web / Frontend** | React Web App (`frontend/`) | Command Center, Manufacturer & Compliance Dashboards, Batch Passport UI, Supply-Chain Graph Visualizer, Online Listing Risk Feed. |
| **Member 2** | **Mobile** | Flutter Mobile App (`mobile/`) | Pharmacy & Distributor workflows, Disposal facility verification, QR/Barcode scanning, Digital custody handoffs, Photo/certificate capture. |
| **Member 3** | **Backend / Database** | FastAPI + Postgres (`backend/`) | Relational & Ledger DB schema, Core REST APIs, RBAC & JWT auth, Reverse Logistics state machine, Dead Batch Registry, Immutable Audit Trail. |
| **Member 4** | **AI / Intelligence** | AI Engine (`ai_engine/`) | Expiry prediction models, Supply-chain anomaly detection, Re-entry risk scoring, Online marketplace surveillance, Explainable AI insights. |

All four members interact through standardized contracts in `contracts/` and OpenAPI v3 specifications.

---

## 3. Monorepo Structure

```
medico/
├── .env.example                     # Environment template
├── docker-compose.yml               # Local orchestration (Postgres, API, Web)
├── README.md                        # Platform documentation & setup guide
│
├── docs/                            # Architecture, API & Team Specifications
│   ├── ARCHITECTURE.md              # High-level architecture & data flows
│   ├── API_SPECIFICATION.md         # Complete REST API specification
│   ├── RBAC_MATRIX.md               # Role-based access control matrix
│   ├── STATE_MACHINE.md             # Closed-loop batch lifecycle state machine
│   └── TEAM_RESPONSIBILITIES.md     # Detailed member guidelines
│
├── contracts/                       # Shared schemas & type contracts
│   └── openapi.json                 # OpenAPI v3 schema export
│
├── backend/                         # Member 3: FastAPI Backend
│   ├── requirements.txt             # Python dependencies
│   ├── pytest.ini                   # Pytest configuration
│   ├── app/
│   │   ├── main.py                  # FastAPI application entry point
│   │   ├── core/                    # Config, security, JWT, RBAC guards
│   │   ├── db/                      # SQLAlchemy session & base models
│   │   ├── models/                  # DB entity models (Postgres)
│   │   ├── schemas/                 # Pydantic v2 DTOs / request-response
│   │   ├── api/v1/                  # Versioned API routes
│   │   └── seeds/                   # Seed fixtures & scenarios
│   └── tests/                       # Automated backend test suite
│
├── ai_engine/                       # Member 4: AI & ML Engine
│   ├── interfaces.py                # Abstract interfaces & type contracts
│   ├── rule_based_baseline.py       # Baseline inference engine & heuristics
│   └── tests/                       # AI test suite
│
├── frontend/                        # Member 1: React Web Application
│   ├── package.json                 # Node dependencies
│   ├── vite.config.ts               # Vite configuration
│   ├── src/
│   │   ├── types/api.ts             # TypeScript API contracts (mirrors Pydantic)
│   │   ├── services/apiClient.ts    # Typed API client with JWT interceptor
│   │   ├── styles/                  # Design system tokens & CSS baseline
│   │   └── App.tsx                  # App component scaffold
│
└── mobile/                          # Member 2: Flutter Application Scaffold
    ├── pubspec.yaml                 # Flutter dependencies
    └── lib/
        ├── models/                  # Dart models matching backend DTOs
        └── services/api_service.dart# Mobile HTTP API service
```

---

## 4. Quick Start & Local Development

### Prerequisites
- Python 3.10+
- Node.js 18+ (for Web Frontend)
- PostgreSQL (or use Docker Compose / SQLite for rapid prototyping)

### 1. Setup Backend & Seed Database
```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations and seed realistic mock data
python -m app.seeds.seed_data

# Start FastAPI development server
uvicorn app.main:app --reload --port 8000
```
Interactive Swagger API documentation will be available at `http://localhost:8000/docs`.

### 2. Run Test Suite
```bash
pytest backend/tests -v
```

### 3. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```
Web application will be live at `http://localhost:5173`.

---

## 5. Security & RBAC Baseline

PharmaSafe implements strict role-based access control with 6 system roles:
1. **`MANUFACTURER`**: Issues batches, initiates recalls, reviews returns & disposal certificates.
2. **`DISTRIBUTOR`**: Manages warehouse stock, scans inbound/outbound custody, handles reverse transit.
3. **`PHARMACY`**: Scans dispenses, identifies expired/recalled stock, initiates return requests.
4. **`DISPOSAL_FACILITY`**: Verifies received reverse batches, performs destruction, generates digital certificates.
5. **`REGULATOR_AUDITOR`**: Audits batch passports, monitors dead batch alerts, views compliance scores.
6. **`ADMIN`**: Platform administration and entity onboarding.

---

## 6. License
Proprietary Hackathon Project — PharmaSafe Intelligence Team.
## Phase 12 — Final Validation, Hardening & Release (September 2026)

### Validation Results

| Metric | Result |
|--------|--------|
| Total Backend Tests | **168 passed, 0 failed** |
| TypeScript Compilation | **0 errors** |
| Vite Production Build | **Clean (2,345 modules, 263 KB gzip)** |
| Security Hardening | **PASSED** (file upload whitelist, size limit, tamper-evident certs, RBAC matrix) |
| Deterministic Safety Rules | **VERIFIED** (all terminal states block sale unconditionally) |
| AI Decision Support Boundary | **VERIFIED** (AI never overrides safety rules) |

### Documentation Suite (Generated)

- docs/FINAL_ARCHITECTURE.md
- docs/E2E_TEST_REPORT.md
- docs/SECURITY_REVIEW.md
- docs/JUDGE_DEMO_GUIDE.md
- docs/DEPLOYMENT_GUIDE.md
- docs/KNOWN_LIMITATIONS.md

### Phase 12 Hardening Additions

1. File upload extension whitelist enforcement (400 on .exe/.sh/etc.)
2. Evidence finalization immutability guard (403 on delete of finalized records)
3. Cross-tenant inventory isolation verification
4. SHA-256 tamper-evident certificate recalculation invariance test
5. 8-dimensional analytics consistency cross-checks
6. Complete auth header enforcement on all POST /sales/verify calls
7. AI feature attribution (reentry_threat_weight >= 0.9 for dead batches)

**RELEASE READY**
