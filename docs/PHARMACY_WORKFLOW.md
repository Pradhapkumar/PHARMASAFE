# Pharmacy Dispensary Workflow Specification

## Role Context
- **Persona:** Chief Pharmacist / Dispensary Manager
- **Organization Type:** `PHARMACY`
- **Example Organization:** `MedPlus Retail Pharmacy #BLR-882` (`org_medplus_retail`)

---

## 1. Physical Receiving & Intake Reconciliation

### Workflow Steps:
1. **Delivery Arrival:**
   - Consignment arrived via distributor carrier fleet.
   - Pending delivery visible in `GET /api/v1/inventory/transfers/incoming`.
2. **Reconciliation Modal:**
   - Pharmacist verifies batch ID, medicine name, GTIN barcode, and distributor manifest count.
   - Pharmacist counts physical boxes and inputs physical count.
   - Live reconciliation indicator displays green for exact match, amber/red for variance.
3. **Custody Confirmation:**
   - Submission via `POST /api/v1/inventory/transfers/{transfer_id}/receive`.
   - Batch custodian transferred to pharmacy.
   - Batch status set to `AT_PHARMACY`.
   - Milestone `PHARMACY_RECEIVED` appended to Digital Batch Passport.

---

## 2. Dispensary Shelf Inventory Management

- **Status Filters:**
  - `ALL`: Complete shelf catalogue.
  - `ACTIVE`: Safe, in-date stock authorized for dispensing.
  - `NEAR_EXPIRY`: Batches nearing expiry cutoff.
  - `EXPIRED`: Batches past expiration date (automatically locked from Point-of-Sale).
  - `RECALLED`: Batches subject to active safety recalls.
- **Direct Actions:**
  - One-click optical verification scanner test.
  - Immediate navigation to Digital Batch Passport.
  - Quarantine & reverse logistics return initiation.

---

## 3. Point-of-Care Optical Verification

- **Scanning Terminal:**
  - Barcode and GS1 DataMatrix optical scanning simulator.
  - Query: `POST /api/v1/verify/scan` with `scanned_code`.
- **4-Way Ledger Decision Engine:**
  1. `AUTHENTIC`: Batch registered, active, in-date, cleared from Dead Registry. Safe to dispense.
  2. `EXPIRED`: Past expiration date. Hard blocking advisory with quarantine directive.
  3. `RECALLED`: Active manufacturer recall notice. Dispensing blocked.
  4. `DEAD_BATCH_REENTRY_DETECTED`: Inscribed in Dead Batch Registry. Destruction certificate verified. Re-entry alert raised.
