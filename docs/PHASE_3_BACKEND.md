# PharmaSafe Intelligence — Phase 3 Backend Architecture

## Executive Overview
Phase 3 establishes the authoritative, closed-loop backend business logic for PharmaSafe Intelligence. In compliance with the CDSCO drug disposal mandates, the platform enforces strict reverse supply chain tracking, cryptographically certified drug destruction, and real-time defense against dead batch re-entry.

---

## Core Pillars of Phase 3

### 1. Authoritative Backend Enforcement (Zero Client Trust)
- All point-of-sale authorizations, inventory decrements, reverse transitions, and destruction verifications are strictly evaluated by the backend database state machine.
- Clients (web, scanner, mobile POS) cannot override lifecycle checks.

### 2. Batch Lifecycle State Machine
```
MANUFACTURED ──► IN_DISTRIBUTION ──► AT_PHARMACY ──► (SOLD)
                       │                   │
                       ▼                   ▼
                  [RECALLED]          [EXPIRED]
                       │                   │
                       └─────────┬─────────┘
                                 ▼
                          RETURN_INITIATED
                                 ▼
                         RETURN_IN_TRANSIT
                                 ▼
                       RECEIVED_AT_DISPOSAL
                                 ▼
                            DEAD_BATCH
```
- **Terminal States**: `DEAD_BATCH` is an irreversible terminal state.
- **Pre-requisite Validation**: Batches cannot enter reverse logistics unless they are in an eligible state (`EXPIRED`, `RECALLED`, or defective).

### 3. Point-of-Sale Guardrail (`/api/v1/sales`)
Before any medicine unit can be dispensed to a patient:
1. **Batch Existence & Validity**: Confirms the batch exists in the ledger.
2. **Lifecycle Gate**: Rejects sales if status is `DEAD_BATCH`, `EXPIRED`, `RECALLED`, `RETURN_INITIATED`, `RETURN_IN_TRANSIT`, or `RECEIVED_AT_DISPOSAL`.
3. **Expiry Date Check**: Hard cutoff against UTC today (`expiry_date < today`).
4. **Stock Reservation & Atomic Decrement**: Verifies `quantity_on_hand >= sale_quantity`, updates inventory transactionally, and records the sale receipt.
5. **Violation Auditing**: Any attempt to dispense an invalid batch triggers an immediate critical security alert and audit trail event.

### 4. Reverse Logistics & Quantity Reconciliation (`/api/v1/returns`)
- **Initiation**: Pharmacies or distributors initiate returns specifying batch, destination disposal facility, quantity, and reason.
- **Chain of Custody**: Cryptographic manifest hashing accompanies shipment handshakes (`INITIATED` -> `IN_TRANSIT` -> `RECEIVED_AT_DISPOSAL`).
- **Discrepancy Sentinel**: Upon intake at the disposal facility, the actual received physical count is compared against manifest expected count. If discrepancy exceeds tolerance (`±0` units), a `QUANTITY_DISCREPANCY` alert is automatically dispatched to regulators.

### 5. Destruction Certification & Dead Batch Inscription (`/api/v1/destruction`)
- **Dual Verification**: Authorized disposal facilities record destruction method (e.g., thermal incineration at 1200°C), witness name, badge ID, and photo/video evidence links.
- **Cryptographic Hash**: A SHA-256 hash is generated from `PHARMASAFE_CERT:{batch_number}:{gtin}:{quantity}:{method}:{witness_badge}:{timestamp}`.
- **Dead Batch Registry Inscription**: The batch status is updated to `DEAD_BATCH`, inventory is zeroed, and an immutable record is inscribed in the Dead Batch Registry.

### 6. Anti-Re-Entry Surveillance (`/api/v1/verify/scan`)
- Every barcode/QR scan across any pharmacy or distribution node is queried against the Dead Batch Registry.
- If a scanned batch number is found in the Dead Batch Registry:
  1. Instant response: `DEAD_BATCH_REENTRY_DETECTED` with `sale_allowed: false`.
  2. A `DEAD_BATCH_REENTRY` alert is created with `CRITICAL` severity.
  3. Real-time GPS coordinates, timestamp, and device metadata are logged for law enforcement dispatch.
