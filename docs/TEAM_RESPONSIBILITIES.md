# Team Responsibilities & Workflow Contracts
## PharmaSafe Intelligence 4-Engineer Collaboration Guide

---

## Member 1: Web / Frontend Engineer
- **Workspace**: `frontend/`
- **Primary Tech**: React 18, Vite, TypeScript, Vanilla CSS Design System.
- **Responsibilities**:
  1. **Manufacturer Command Center**: Batch issuance forms, recall controls, batch lifecycle overview.
  2. **Regulator & Compliance Portal**: Dead Batch Registry dashboard, active re-entry alerts table, audit trail viewer.
  3. **Batch Passport Visualizer**: Interactive timeline showing batch origin, transit custody, return, and destruction cert.
  4. **AI Risk & Surveillance Feed**: Real-time flagged anomalies and online marketplace listing risk cards.
- **Contract Reference**: `frontend/src/types/api.ts` & `frontend/src/services/apiClient.ts`.

---

## Member 2: Mobile Engineer
- **Workspace**: `mobile/`
- **Primary Tech**: Flutter 3.x, Dart, Camera / Barcode packages.
- **Responsibilities**:
  1. **Pharmacy Point-of-Care Module**: Quick barcode scanner, instant verification status (Authentic, Expired, Recalled, Dead Batch Alert).
  2. **Reverse Return Workflow**: Scan expired batch, enter return quantity, select return reason, submit return manifest.
  3. **Distributor Inbound/Outbound Custody**: Scan batches, sign digital custody handoff.
  4. **Disposal Facility Evidence Capture**: Take photo of physical destruction, log dual witnesses, submit destruction verification.
- **Contract Reference**: `mobile/lib/models/` & `mobile/lib/services/api_service.dart`.

---

## Member 3: Backend & Database Engineer
- **Workspace**: `backend/`
- **Primary Tech**: FastAPI, PostgreSQL, SQLAlchemy 2.0, Pydantic v2, Alembic, Pytest.
- **Responsibilities**:
  1. **Core Database Schema & Migrations**: Relational schema for Batches, Custody Transfers, Returns, Destruction Records, Dead Batch Registry, and Audit Logs.
  2. **Authentication & RBAC**: JWT bearer tokens, role validation dependencies (`require_role(...)`).
  3. **Closed-Loop State Machine**: Transactional safety on state transitions, preventing invalid jumps.
  4. **Dead Batch Registry & Re-Entry Trigger**: Instant check against `dead_batch_registry` on every scan.
  5. **API Endpoints & Documentation**: Maintain versioned `/api/v1` routes and auto-generated Swagger UI.
- **Contract Reference**: `backend/app/schemas/` & `backend/app/models/`.

---

## Member 4: AI / ML / Intelligence Engineer
- **Workspace**: `ai_engine/` (and `backend/app/api/v1/intelligence.py`)
- **Primary Tech**: Python 3.10+, Scikit-Learn, Pandas, NumPy, Heuristic Risk Models.
- **Responsibilities**:
  1. **Expiry Prediction Model**: Predict batch degradation rate and early warning scores based on shelf-life velocity.
  2. **Supply Chain Anomaly Detector**: Identify unnatural transit velocity, geographic jumps, and unexpected custody transfers.
  3. **Re-Entry Risk Scorer**: Composite Bayesian / heuristic risk scorer flagging probability of diverted stock entering commerce.
  4. **Online Marketplace Intelligence**: Parse scraped e-commerce listings, extract suspected batch numbers, match against Dead Batch Registry.
  5. **Explainable AI Layer**: Provide human-interpretable rationale for high-risk scores.
- **Contract Reference**: `ai_engine/interfaces.py` & `ai_engine/rule_based_baseline.py`.
