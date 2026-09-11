# PharmaSafe Intelligence — Final System Architecture

## Overview

PharmaSafe Intelligence is a closed-loop pharmaceutical reverse logistics and compliance platform that tracks medicine batches from manufacture through distribution, pharmacy verification, sale blocking, reverse logistics, disposal, destruction certification, Dead Batch Registry closure, and online medicine safety monitoring.

**Version:** Release v1.0.0 (Phase 12 — Final Hardening)  
**Build Date:** September 2026  
**Status:** RELEASE READY

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | React + TypeScript | 18.x |
| Build Tool | Vite | 5.4.x |
| Backend Framework | FastAPI | 0.115.x |
| Python Runtime | Python | 3.10.x |
| ORM | SQLAlchemy | 2.0.x |
| Database | SQLite (dev) | 3.x |
| Authentication | JWT (python-jose) | HS256 |
| AI Engine | Custom Python Ensemble | pharma-risk-v2.1 |
| Testing | pytest + FastAPI TestClient | 9.1.x |

---

## Core Business Rules (Inviolable)

1. EXPIRED, RECALLED, DESTROYED, DEAD_BATCH, FLAGGED_SUSPICIOUS, QUARANTINED batches MUST always result in BLOCK_SALE. No AI override.
2. SHA-256 tamper-evident canonical hashes on all destruction certificates.
3. Dead Batch Registry entries are permanent — write-once, never deleted.
4. Finalized evidence (is_finalized=True) rejects deletion with HTTP 403.
5. AI risk scores are advisory decision support only — never override safety rules.
6. All privileged endpoints enforce JWT RBAC.

---

## RBAC Matrix

| Role | Permissions |
|------|------------|
| ADMIN | All operations |
| MANUFACTURER | Create batches, custody transfers, view passport |
| DISTRIBUTOR | Receive/transfer custody, initiate returns |
| PHARMACY | Receive transfers, verify/sell batches, initiate returns |
| DISPOSAL_FACILITY | Accept disposals, issue destruction certificates |
| REGULATOR_AUDITOR | Read-only access to all records, verify certificates |

---

## API Route Structure

All routes prefixed /api/v1/:
- auth/ — Login, register, me
- batches/ — Batch CRUD, passport, scan/verify
- medicines/ — Medicine master catalog
- organizations/ — Organization registry
- inventory/ — Receive, transfer, query
- sales/ — verify, execute, list
- custody/ — Transfer log
- returns/ — Initiate, accept, route
- disposal/ — Intake, complete, records
- destruction/ — Create certificate, verify, dead-batch list
- dead-batches/ — Sovereign registry query
- online-safety/ — Verify listing, ingest, takedown
- intelligence/ — evaluate/{batch}, fleet summary, simulation
- evidence/ — upload, list, delete (w/ immutability guard)
- investigations/ — cases, dossier, timeline, notes
- analytics/ — overview, forward-supply, reverse-logistics, disposal-throughput, destruction, online-marketplace, ai-risk, compliance
- reports/ — batch forensic dossier
- health/ — system health, db connectivity

---

## Security Architecture

- JWT authentication with RBAC role enforcement
- Evidence upload extension whitelist (.jpg, .jpeg, .png, .webp, .pdf, .tif, .tiff, .txt, .csv, .json, .bmp)
- Maximum evidence file size: 25 MB (HTTP 413 on excess)
- Directory traversal prevention on file storage
- Canonical SHA-256 verification detects any destruction certificate tampering
- Finalized evidence permanently sealed (HTTP 403 on delete attempt)
- All operations generate audit log entries
