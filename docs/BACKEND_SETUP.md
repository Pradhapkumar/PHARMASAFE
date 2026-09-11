# PharmaSafe Intelligence — Backend Setup & Developer Guide

## Prerequisites
- Python 3.10+ (tested on Python 3.11/3.12)
- Node.js 18+ (for frontend)
- Git

---

## 1. Environment Setup

### Clone Repository & Create Virtual Environment
```bash
cd d:/medico

# Create virtual environment (if not already created)
python -m venv backend/venv

# Activate virtual environment
# Windows (PowerShell):
backend\venv\Scripts\Activate.ps1
# Linux / macOS:
source backend/venv/bin/activate
```

### Install Dependencies
```bash
pip install -r backend/requirements.txt
```

---

## 2. Configuration & Database Initialization

### Environment Variables
Copy `.env.example` to `.env`:
```bash
cp backend/.env.example backend/.env
```

### Database Seeding
PharmaSafe includes an automated seed script that populates standard organizations, users, medicine catalogs, and batches (including the demo batch **B1001**):
```bash
python -m backend.app.db.seed
```

---

## 3. Running the Server

### Development Server (Uvicorn)
```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **ReDoc Specification**: `http://localhost:8000/redoc`
- **Health Check**: `http://localhost:8000/api/health`

---

## 4. Running the Pytest Test Suite

Execute the complete 59-test suite verifying auth, batch lifecycle, POS blocking, reverse custody, destruction integrity, and re-entry interception:
```bash
python -m pytest backend/tests -v
```
All 59 unit and integration tests must pass cleanly.
