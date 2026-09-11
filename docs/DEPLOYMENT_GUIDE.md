# PharmaSafe Intelligence — Deployment Guide

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm 9+
- Git

---

## Development Setup

### 1. Clone Repository
git clone <repository-url>
cd medico

### 2. Backend Setup
Create virtual environment:
python -m venv venv

Activate (Windows):
venv\Scripts\Activate.ps1

Install dependencies:
pip install -r requirements.txt

### 3. Database Initialization
python -m backend.app.db.seed_data

### 4. Start Backend Server
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

API available at: http://127.0.0.1:8000
API Docs: http://127.0.0.1:8000/docs

### 5. Frontend Setup
cd frontend
npm install

### 6. Start Frontend Dev Server
npm run dev

Frontend available at: http://localhost:5173

---

## Environment Configuration

Create .env file in backend/app/core/:

SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=60
DATABASE_URL=sqlite:///./pharmasafe.db

---

## Running Tests

cd d:/medico (project root)
python -m pytest backend/tests -v

Expected: 168 passed, 0 failed

---

## Production Build

Frontend production bundle:
cd frontend
npm run build
Output in: frontend/dist/

---

## Known Limitations for Production Deployment

1. Replace SQLite with PostgreSQL or MySQL
2. Replace local file storage with object storage (S3/GCS)
3. Rotate and manage SECRET_KEY via secrets manager
4. Add rate limiting middleware (e.g., slowapi)
5. Enforce HTTPS/TLS termination
6. Add Redis for caching analytics queries
7. Implement MFA for high-privilege roles

---

## Health Check Endpoints

GET /api/health → {"status": "ok", "version": "1.0.0"}
GET /api/v1/health → {"status": "ok", "version": "1.0.0"}
GET /api/health/db → {"database": "connected"}
GET /api/v1/health/db → {"database": "connected"}
