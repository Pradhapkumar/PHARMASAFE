# PharmaSafe Intelligence — Judge Demo Guide

## Platform Overview

PharmaSafe Intelligence is a closed-loop pharmaceutical reverse logistics and compliance platform. This guide walks judges through the complete 11-module platform demonstration.

**Frontend URL:** http://localhost:5173  
**Backend API:** http://127.0.0.1:8000  
**API Documentation:** http://127.0.0.1:8000/docs

---

## Pre-Demo Setup

1. Ensure backend is running: python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
2. Ensure frontend is running: npm run dev (in frontend/ directory)
3. Navigate to http://localhost:5173 to verify the platform loads

---

## Demo Account Credentials

The demo uses a mock authentication system. The following demo roles are available via the "Demo Mode" selector in the login page:

| Role | Email | Organization |
|------|-------|-------------|
| MANUFACTURER | mfr@pfizer.com | Pfizer Global Mfg |
| DISTRIBUTOR | dist@apollo.com | Apollo Logistics |
| PHARMACY | pharm@medplus.com | MedPlus Community Pharmacy |
| DISPOSAL_FACILITY | eco@apex.com | Apex Eco-Disposal Plant A |
| REGULATOR_AUDITOR | auditor@cdsco.gov.in | CDSCO Regulatory Authority |

---

## Module 1 — Executive Dashboard

**URL:** http://localhost:5173/

**What to show:**
- KPI cards: Total Batches, Active Alerts, Blocked Sales, AI Risk Score
- Live alert feed with severity badges
- Quick-action navigation tiles
- System status indicators

**Key talking points:**
- The dashboard gives the regulatory auditor a real-time view of the entire pharma supply chain
- Alerts are generated automatically on anomalies (dead batch re-entry, speed violations, quantity shrinkage)

---

## Module 2 — Digital Batch Passport (B1001)

**URL:** http://localhost:5173/batches (click B1001 or search)

**What to show:**
- Batch metadata: medicine name, lot number, GTIN barcode, manufacturing date, expiry
- Chain of Custody tab: chronological transfer log from manufacturer → distributor → pharmacy → return → disposal → destruction
- Quantity tab: initial quantity, current quantity, shrinkage
- Security tab: QR code, GS1 barcode, SHA-256 fingerprints

**Key talking points:**
- The Digital Batch Passport is a permanent, immutable record from birth to death of every medicine lot
- B1001 is our master demonstration batch — trace it through the complete 10-phase lifecycle

---

## Module 3 — Point-of-Sale (POS) Verification

**URL:** http://localhost:5173/pos

**What to show:**
- Scan / lookup by batch number
- Enter batch number: AMX-2024-DEAD-01 → shows BLOCK_SALE with CRITICAL overlay
- Enter batch number: AZT-2025-EXP → shows BLOCK_SALE with EXPIRED reason
- Enter batch number: B1001 → shows the current verdict
- 8-point validation checklist visible for each result

**Key talking points:**
- The backend is the ONLY authority for sale decisions — the frontend never decides
- Dead batch blocking is instantaneous and deterministic
- The 8-point checklist gives pharmacists full audit transparency

---

## Module 4 — Reverse Logistics & Return Management

**URL:** http://localhost:5173/returns

**What to show:**
- Open return requests with status pipeline: INITIATED → IN_TRANSIT → RECEIVED_AT_DISPOSAL
- Discrepancy alerts where quantity received ≠ quantity shipped
- Return reason distribution (EXPIRED, RECALLED, DAMAGED)

---

## Module 5 — Disposal Facility Operations

**URL:** http://localhost:5173/disposal

**What to show:**
- Intake records from pharmacy/distributor returns
- Scale weight verification compliance
- Disposal completion records with method (HIGH_TEMP_INCINERATION_1200C)

---

## Module 6 — Destruction Certificates

**URL:** http://localhost:5173/destruction

**What to show:**
- SHA-256 canonical certificate hashes (64-character hex strings)
- Certificate verification status (PENDING → VERIFIED)
- Quantity destroyed vs. quantity disposed (must match)
- Witness and badge ID records

**Key talking points:**
- Certificates are tamper-evident — any data change produces a detectably different hash
- Verified certificates are immutable compliance records

---

## Module 7 — Sovereign Dead Batch Registry

**URL:** http://localhost:5173/dead-batches

**What to show:**
- Permanently inscribed destroyed batch records
- Cryptographic SHA-256 destruction certificate hashes
- Inscription timestamps and facility records
- Confirm AMX-2024-DEAD-01 appears in the registry

**Key talking points:**
- The Dead Batch Registry is write-once and permanent
- Any medicine lot appearing here is blocked for all time from further sale

---

## Module 8 — Online Marketplace Surveillance

**URL:** http://localhost:5173/online-safety

**What to show:**
- Live listing verification results: ALLOW / REVIEW / BLOCK decisions
- Dead batch re-entry intercepts (AMX-2024-DEAD-01 detected on DarkWeb marketplace)
- Platform breakdown: monitored listings by platform
- Takedown enforcement records

**Key talking points:**
- The platform monitors medicine listings for possible re-entry of destroyed batches
- "Possible re-entry" language is used deliberately — these are decision support flags, not legal determinations

---

## Module 9 — AI Risk & Anomaly Intelligence

**URL:** http://localhost:5173/ai-risk

**What to show:**
- Fleet risk summary: total batches monitored, high-risk lots, active anomalies
- Individual batch risk evaluation for AMX-2024-DEAD-01 (composite_risk_score = 1.0, CRITICAL)
- SHAP-inspired feature attribution breakdown (radar chart showing 5 risk dimensions)
- Speed violation anomalies (physically impossible transit velocity)
- Quantity shrinkage anomalies

**Key talking points:**
- AI is strictly decision SUPPORT — it never overrides safety rules
- Even if AI gave a low score, a DEAD_BATCH would still be permanently blocked
- The composite risk score = 1.0 for dead batches is forced by the deterministic safety shield

---

## Module 10 — Investigation Dossiers

**URL:** http://localhost:5173/investigations

**What to show:**
- Open case INV-2026-B1001 (CRITICAL priority)
- 360-degree evidentiary index with SHA-256 fingerprints
- Chronological timeline from manufacture to destruction
- Add investigation note (append-only evidence log)
- Generate forensic report button

**Key talking points:**
- Every investigation has a complete chronological evidence trail
- Evidence records are append-only — no modifications permitted after finalization
- Reports are exportable as forensic compliance dossiers

---

## Module 11 — Executive Analytics & Compliance Index

**URL:** http://localhost:5173/analytics

**What to show:**
- Overview tab: batch counts, transfer volumes, blocked sales count
- Forward Supply tab: custody transfer pipeline metrics
- Reverse Logistics tab: return rates, discrepancy rates
- Disposal & Destruction tabs: destruction throughput
- Online Safety tab: listing surveillance metrics
- AI Risk tab: risk score distribution
- Compliance Index tab: 98.7% overall compliance score with 8 OPTIMAL/PERFECT dimensions

**Key talking points:**
- The compliance index provides regulators with a single-number executive view
- All 8 regulatory dimensions are tracked continuously
- Hash integrity rate: 100% — no tampered certificates detected

---

## Demo Q&A Talking Points

**Q: What prevents the AI from approving sale of a destroyed batch?**
A: The deterministic safety rules always execute first, before AI evaluation. A DEAD_BATCH status triggers BLOCK_SALE unconditionally. The AI composite score is set to 1.0 for dead batches, but even if it were 0.0, the sale would still be blocked.

**Q: How do you know a destruction certificate hasn't been tampered with?**
A: Every certificate has a SHA-256 hash of its canonical data. Any change to any field — even a single character — produces a completely different hash. Verification re-computes the hash and compares.

**Q: What happens when a destroyed medicine appears for sale online?**
A: The online surveillance engine checks every listing against the Dead Batch Registry. A match triggers a BLOCK decision and generates a CRITICAL alert flagged as "possible re-entry." The platform does not make legal determinations but provides regulators with actionable intelligence.

**Q: How does RBAC work?**
A: Every API request requires a JWT token with a role claim. The RoleChecker dependency validates the role matches the permitted roles for each endpoint. A pharmacy cannot issue destruction certificates; a disposal facility cannot create medicine batches.
