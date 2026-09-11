# Phase 6: Medicine Verification & Point-of-Sale Safety Engine

## Executive Summary

Phase 6 hardens the authoritative Point-of-Sale safety gate of **PharmaSafe Intelligence**, establishing that **THE FRONTEND MUST NEVER DECIDE WHETHER A MEDICINE CAN BE SOLD**. 

All sale authorizations are computed server-side via an **8-Point Algorithmic Verification Pipeline** against the live PostgreSQL database.

---

## The 8-Point Verification Pipeline

Every pre-flight check (`POST /api/v1/sales/verify`) and transaction attempt (`POST /api/v1/sales`) executes the following checks sequentially:

1. **Batch Ledger Registry Check (`NOT_FOUND`)**: Validates GTIN barcode and batch number against the master registry.
2. **Dead Batch Registry Check (`DESTROYED`)**: Verifies lot has not been certified destroyed or inscribed in the sovereign Dead Batch Registry.
3. **Recall Surveillance Check (`RECALLED`)**: Checks active manufacturer or regulatory CDSCO recall advisories.
4. **Expiry Horizon Check (`EXPIRED`)**: Compares batch expiration date against current UTC date.
5. **Suspension & Anomaly Check (`FLAGGED_SUSPICIOUS`)**: Flags elevated supply-chain risk scores.
6. **Reverse Chain Quarantine Check (`QUARANTINED`)**: Ensures lot is not in reverse transit (`RETURN_INITIATED`, `RETURN_IN_TRANSIT`, `RECEIVED_AT_DISPOSAL`).
7. **Dispensary Stock Availability (`INSUFFICIENT_STOCK`)**: Verifies facility on-shelf stock is $\ge$ requested quantity.
8. **Custody & Ownership Check (`NOT_OWNER`)**: Confirms seller organization has legitimate custody/ownership.

---

## API Endpoints (Phase 6)

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/v1/sales/verify` | Pre-flight POS safety check evaluating all 8 checks without altering state | Pharmacy, Distributor, Admin |
| `POST` | `/api/v1/sales` | Authoritative sale execution; deducts stock on `ALLOW_SALE`, logs alerts/audit on `BLOCK_SALE` | Pharmacy, Distributor, Admin |
| `GET` | `/api/v1/sales` | Fetch sales transaction & lockout history with status/search filters | Authenticated Users |

---

## Test Verification

- **Automated Tests:** 81/81 passing Pytest test scenarios (`test_sales.py` expanded with 6 new pre-check and batch number resolution tests).
- **TypeScript Compilation:** Passed with 0 errors (`tsc --noEmit`).
- **Production Build:** Clean Vite bundle generated in 10.39s.
