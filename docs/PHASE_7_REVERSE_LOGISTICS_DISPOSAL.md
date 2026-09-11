# Phase 7 — Reverse Logistics + Disposal Architecture

## Overview

Phase 7 implements the complete operational reverse supply chain workflow after a pharmaceutical batch is blocked, expired, recalled, quarantined, or otherwise requires removal from normal commercial circulation.

```
PHARMACY DISPENSARY
   ↓ (Scan & quarantine)
CREATE RETURN MANIFEST (`POST /api/v1/returns`)
   ├── Tracking Code: TRK-REV-YYYYMMDD-XXXXXX
   ├── SHA-256 Manifest Hash
   └── Batch Status: RETURN_INITIATED
   ↓
PICKUP & IN TRANSIT (`PATCH /api/v1/returns/{id}/status` -> IN_TRANSIT)
   ├── Carrier: Name, Waybill Ref, Driver Badge
   └── Custody Transfer: PHARMACY_TO_REVERSE_CARRIER
   ↓
RECEIVING ORGANIZATION INTAKE (`PATCH /api/v1/returns/{id}/status` -> RECEIVED_AT_DISPOSAL)
   ├── Physical Count & Scale Tare Weigh-In (kg)
   ├── Quantity Reconciliation: received_quantity vs expected_quantity
   └── Discrepancy Alert: Auto-raises HIGH severity alert if variance > tolerance
   ↓
ROUTE TO DISPOSAL (`POST /api/v1/returns/{id}/route-to-disposal`)
   └── Wholesale depot routes stock consignment to bio-hazard disposal plant
   ↓
DISPOSAL INTAKE & EXECUTED (`POST /api/v1/destruction/records`)
   ├── 1200°C Thermal Rotary Kiln Incineration
   ├── Cryptographic SHA-256 Destruction Certificate Generated
   ├── Batch Quantity Reduced to 0
   ├── Batch Status: DEAD_BATCH
   └── Automatic Inscription into Dead Batch Registry
```

## Security & Compliance Principles

1. **Zero-Trust Role-Based Custody**: Every custody transition (`INITIATED`, `IN_TRANSIT`, `RECEIVED_AT_DISPOSAL`, `ROUTED_TO_DISPOSAL`, `COMPLETED_DESTROYED`) is authorized against the authenticated user's organization ID from JWT.
2. **Cryptographic SHA-256 Manifest & Certificate**: Return manifests and destruction certificates calculate deterministic SHA-256 hashes binding batch number, barcode, quantity, witness badge ID, and ISO timestamp.
3. **Automated Discrepancy Alerting**: If physical intake quantity differs from returned manifest quantity by more than the configured tolerance threshold (`QUANTITY_DISCREPANCY_TOLERANCE`), a `HIGH` severity alert is immediately dispatched to system administrators and regulators.
