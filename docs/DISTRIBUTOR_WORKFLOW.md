# Distributor Logistics Workflow Specification

## Role Context
- **Persona:** Wholesale Logistics Manager / Depot Controller
- **Organization Type:** `DISTRIBUTOR`
- **Example Organization:** `Apollo National Logistics Hub` (`org_apollo_logistics`)

---

## 1. Receiving Inbound Manufacturer Consignments

### Workflow Steps:
1. **Manifest Notification:**
   - Manufacturer dispatches batch with `stage = MANUFACTURE_TO_DISTRIBUTOR`.
   - Transfer record appears in `GET /api/v1/inventory/transfers/incoming`.
2. **Physical Count Verification:**
   - Receiving staff counts physical units upon truck unloading.
   - Staff inputs verified count into modal: `POST /api/v1/inventory/transfers/{transfer_id}/receive`.
3. **Discrepancy Resolution:**
   - If `received_quantity == expected_quantity`:
     - Discrepancy = 0, status marked `VERIFIED`.
   - If `received_quantity != expected_quantity`:
     - Discrepancy logged with variance.
     - System automatically creates `HIGH` severity `QUANTITY_DISCREPANCY` alert:
       `"Consignment mismatch for batch B1005: expected 1000, received 980 (Discrepancy: -20 units)."`
4. **Inventory & Custody Inscription:**
   - Recipient warehouse stock balance updated atomically.
   - Batch custodian set to distributor organization.
   - Batch status transitioned to `IN_DISTRIBUTION`.
   - Milestone `DISTRIBUTOR_RECEIVED` recorded on the Digital Batch Passport.

---

## 2. Depot Inventory & Storage Management

- **Inventory Search & Filter:**
  - Real-time querying across batch number, medicine name, GTIN, and shelf location.
  - Expiry monitoring: auto-flags near-expiry lots (e.g. $\le 90$ days).
- **Quarantine Allocation:**
  - Damaged or discrepancy stock flagged to prevent unauthorized outbound dispatch.

---

## 3. Outbound Transfer Dispatch to Retail Pharmacy

### Workflow Steps:
1. **Dispatch Form Parameters:**
   - Target Retail Pharmacy (e.g. `org_medplus_retail`).
   - Batch Number and Available Stock selection.
   - Quantity to Dispatch (enforces `quantity <= available_stock`).
   - Route and transport details (Carrier, vehicle, driver license, temperature range).
2. **Atomic Ledger Execution:**
   - Source inventory decremented immediately: `quantity_available -= dispatch_quantity`.
   - Outbound `CustodyTransfer` created with `stage = DISTRIBUTOR_TO_PHARMACY` and `is_confirmed = False`.
   - Batch milestone `DISTRIBUTOR_TO_PHARMACY` recorded in passport.
3. **Audit Log:**
   - Audit entry registered with full dispatch payload and actor ID.
