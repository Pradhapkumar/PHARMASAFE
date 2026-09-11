# Closed-Loop State Machine Specification
## PharmaSafe Batch Lifecycle & Dead Batch Governance

---

## 1. Batch State Definitions

| State Code | Name | Description | Allowed Transitions |
| :--- | :--- | :--- | :--- |
| `MANUFACTURED` | Manufactured | Batch produced and cataloged by Manufacturer. | `IN_DISTRIBUTION`, `RECALLED` |
| `IN_DISTRIBUTION` | In Distribution | Batch in transit or stored in Distributor warehouse. | `AT_PHARMACY`, `EXPIRED`, `RECALLED`, `FLAGGED_SUSPICIOUS` |
| `AT_PHARMACY` | At Pharmacy / In Stock | Batch available at retail or hospital pharmacy. | `DISPENSED`, `EXPIRED`, `RECALLED`, `FLAGGED_SUSPICIOUS` |
| `DISPENSED` | Dispensed | Medicine dispensed to end-user / patient. | Terminal for active unit. |
| `EXPIRED` | Expired | Batch has passed its stated expiration date. Sales blocked. | `RETURN_INITIATED` |
| `RECALLED` | Recalled | Manufacturer or Regulator issued mandatory recall. Sales blocked. | `RETURN_INITIATED` |
| `FLAGGED_SUSPICIOUS` | Flagged Suspicious | AI anomaly detection or scan mismatch flagged the batch. | `RETURN_INITIATED`, `ACTIVE` (if cleared by Regulator) |
| `RETURN_INITIATED` | Return Initiated | Reverse logistics request created by Pharmacy or Distributor. | `RETURN_IN_TRANSIT` |
| `RETURN_IN_TRANSIT` | Return In Transit | Reverse shipment accepted by reverse carrier/distributor. | `RECEIVED_AT_DISPOSAL` |
| `RECEIVED_AT_DISPOSAL`| Received at Disposal | Verified and logged at authorized destruction facility. | `DESTROYED` |
| `DESTROYED` | Destroyed | Physically incinerated/neutralized with certificate hash. | `DEAD_BATCH_REGISTRY` |
| `DEAD_BATCH` | Dead Batch Registry | Permanent cryptographic blacklisting. Re-entry surveillance active. | **IMMUTABLE TERMINAL STATE** |

---

## 2. State Transition Matrix & Enforcement Rules

```
+---------------------+-------------------+--------------------------------------------+
| Current State       | Next State        | Required Authority & Condition             |
+---------------------+-------------------+--------------------------------------------+
| MANUFACTURED        | IN_DISTRIBUTION   | MANUFACTURER initiates custody transfer    |
| IN_DISTRIBUTION     | AT_PHARMACY       | PHARMACY scans & confirms receipt          |
| AT_PHARMACY         | EXPIRED           | Automated Time Trigger / Pharmacy Scan     |
| ANY (non-destroyed) | RECALLED          | MANUFACTURER or REGULATOR_AUDITOR          |
| ANY (non-destroyed) | FLAGGED_SUSPICIOUS| AI Engine / Anomaly Detection / User Alert |
| EXPIRED / RECALLED  | RETURN_INITIATED  | PHARMACY / DISTRIBUTOR                     |
| RETURN_INITIATED    | RETURN_IN_TRANSIT | Reverse Logistics Carrier / DISTRIBUTOR    |
| RETURN_IN_TRANSIT   | RECEIVED_AT_DISPOSAL| DISPOSAL_FACILITY Officer                |
| RECEIVED_AT_DISPOSAL| DESTROYED         | DISPOSAL_FACILITY Officer + Witness        |
| DESTROYED           | DEAD_BATCH        | AUTOMATIC (System issues SHA-256 cert)     |
+---------------------+-------------------+--------------------------------------------+
```

---

## 3. The Dead Batch Re-Entry Alert Trigger

When a batch transitions to `DEAD_BATCH`:
1. It is recorded in the `dead_batch_registry` database table.
2. The batch SHA-256 certificate is immutably indexed.
3. If an endpoint receives a verification request (`/api/v1/verify/scan`) or online marketplace ingestion (`/api/v1/intelligence/online-surveillance`) with a `DEAD_BATCH` identifier:
   - Verification status is immediately set to `DEAD_BATCH_REENTRY_DETECTED`.
   - Critical incident alert is broadcast to Manufacturer and Regulator.
   - GPS coordinate and timestamp of the offending scan are archived for law enforcement.
