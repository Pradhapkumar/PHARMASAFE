# PharmaSafe Intelligence — Frontend-Backend Integration Guide

## Architecture Overview
The PharmaSafe frontend (React 18 + Vite + TypeScript + Tailwind CSS) communicates with the FastAPI backend over REST APIs. The architecture includes:
1. **API Client & Proxy**: Vite dev server proxies `/api` requests to `http://localhost:8000`.
2. **Dual-Mode Operation**: When `VITE_USE_MOCK_DATA=true`, services fall back to local mock stores. When `false` (default), services communicate directly with the live database.
3. **Graceful Degradation**: Frontend services automatically fall back to deterministic local state if network connectivity to the backend drops during presentations or judging sessions.

---

## Environment Configuration

In `frontend/.env`:
```env
# Point to running FastAPI instance
VITE_API_BASE_URL=/api/v1

# Set to 'true' only if running offline without Python backend
VITE_USE_MOCK_DATA=false
```

---

## Service Mapping Table

| Service File | Primary Backend Endpoint | Mock Fallback Data |
| :--- | :--- | :--- |
| `authService.ts` | `POST /api/v1/auth/login`, `GET /api/v1/auth/me` | `MOCK_USERS` |
| `batchService.ts` | `GET /api/v1/batches`, `GET /api/v1/batches/:id/passport`, `POST /api/v1/verify/scan` | `MOCK_BATCHES`, `demoState` |
| `returnService.ts` | `GET /api/v1/returns`, `POST /api/v1/returns`, `PATCH /api/v1/returns/:id/status` | `MOCK_RETURNS` |
| `disposalService.ts` | `POST /api/v1/destruction/records` | `MOCK_DISPOSAL_INTAKE` |
| `certificateService.ts`| `GET /api/v1/destruction/records`, `GET /api/v1/dead-batches` | `MOCK_CERTIFICATES`, `MOCK_DEAD_BATCHES` |
| `alertService.ts` | `GET /api/v1/alerts`, `PATCH /api/v1/alerts/:id/read` | `MOCK_ALERTS` |
| `auditService.ts` | `GET /api/v1/audit/logs`, `GET /api/v1/audit/compliance/summary` | `MOCK_AUDIT_TRAIL` |
| `dashboardService.ts` | `GET /api/v1/dashboard/summary`, `GET /api/v1/dashboard/expiry-trend` | Mock KPI calculation |

---

## Running the Integrated Stack Locally

### 1. Launch Backend (Terminal 1)
```bash
cd d:/medico
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Launch Frontend (Terminal 2)
```bash
cd d:/medico/frontend
npm run dev
```

Visit `http://localhost:5173` (or the port Vite outputs) to access the integrated PharmaSafe portal.
