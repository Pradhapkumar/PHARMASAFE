# PharmaSafe Intelligence — Authentication & RBAC Specification

## Overview
PharmaSafe enforces strict, zero-trust Role-Based Access Control (RBAC) backed by digitally signed JSON Web Tokens (HMAC-SHA256).

---

## Roles Hierarchy & Definitions

| Role Code | Display Title | Typical Organization | Core Responsibilities |
| :--- | :--- | :--- | :--- |
| `MANUFACTURER` | Manufacturer Admin | Pharma Manufacturer (e.g. Pfizer) | Register batches, mint passports, initiate recalls |
| `DISTRIBUTOR` | Distributor / Logistics | 3PL / Logistics Hub (e.g. Apollo) | Receive shipments, transfer inventory, update reverse transit |
| `PHARMACY` | Pharmacy Dispenser | Retail / Hospital Pharmacy (e.g. MedPlus) | Receive stock, verify scans, dispense sales, initiate returns |
| `DISPOSAL_FACILITY` | Disposal Facility Operator | Hazardous Waste Site (e.g. GreenShield) | Receive returns, verify quantity, certify destruction |
| `REGULATOR_AUDITOR` | Regulatory Inspector | CDSCO / State FDA / Auditor | Inspect audit trail, review compliance score, monitor alerts |
| `ADMIN` | System Administrator | PharmaSafe Security Operations | Global platform governance, org management, bypass overrides |

---

## Endpoint Permission Matrix

| API Group | Endpoint Path | Allowed Roles | Enforced Invariant |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST /api/v1/auth/login` | Public | Validates email & password, returns JWT |
| **Auth** | `GET /api/v1/auth/me` | Any Authenticated | Extracts current user from JWT claims |
| **Batches** | `POST /api/v1/batches` | `MANUFACTURER`, `ADMIN` | Prevents duplicate batch numbers |
| **Batches** | `GET /api/v1/batches` | Any Authenticated | Lists batches with optional status filter |
| **Batches** | `POST /api/v1/batches/{id}/recall` | `MANUFACTURER`, `REGULATOR_AUDITOR`, `ADMIN` | Transitions status to `RECALLED` |
| **Verify** | `POST /api/v1/verify/scan` | Public / Any | Checks Dead Batch Registry & expiry |
| **Inventory** | `POST /api/v1/inventory/receive` | `DISTRIBUTOR`, `PHARMACY`, `MANUFACTURER`, `ADMIN` | Increments local stock balance |
| **Inventory** | `POST /api/v1/inventory/transfer` | `DISTRIBUTOR`, `MANUFACTURER`, `ADMIN` | Decrements source, increments dest |
| **Sales** | `POST /api/v1/sales` | `PHARMACY`, `ADMIN` | Strictly blocks expired/recalled/dead batches |
| **Returns** | `POST /api/v1/returns` | `PHARMACY`, `DISTRIBUTOR`, `ADMIN` | Initiates reverse logistics manifest |
| **Returns** | `PATCH /api/v1/returns/{id}/status` | `DISTRIBUTOR`, `DISPOSAL_FACILITY`, `ADMIN` | Tracks custody & verifies quantity reconciliation |
| **Destruction** | `POST /api/v1/destruction/records` | `DISPOSAL_FACILITY`, `ADMIN` | Mints certificate, marks batch DEAD_BATCH |
| **Dead Batches** | `GET /api/v1/dead-batches` | Any Authenticated | Lists all inscribed dead batches |
| **Alerts** | `GET /api/v1/alerts` | Any Authenticated | Lists alerts filterable by severity |
| **Alerts** | `PATCH /api/v1/alerts/{id}/read` | Any Authenticated | Marks alert as read |
| **Audit** | `GET /api/v1/audit/logs` | `ADMIN`, `REGULATOR_AUDITOR`, `MANUFACTURER` | Immutable log trail |
| **Dashboard** | `GET /api/v1/dashboard/summary` | Any Authenticated | Real-time deterministic DB metrics |

---

## Test Accounts & Credentials

All demo accounts share the standard password: `password123`

```
manufacturer@pharmasafe.demo  -> MANUFACTURER (Pfizer Healthcare India Ltd.)
distributor@pharmasafe.demo   -> DISTRIBUTOR (Apollo National Logistics)
pharmacy@pharmasafe.demo      -> PHARMACY (MedPlus Central Pharmacy #104)
disposal@pharmasafe.demo      -> DISPOSAL_FACILITY (GreenShield Bio-Hazard Incinerator)
regulator@pharmasafe.demo     -> REGULATOR_AUDITOR (CDSCO Central Drug Authority)
admin@pharmasafe.demo         -> ADMIN (PharmaSafe Security Operations)
```
