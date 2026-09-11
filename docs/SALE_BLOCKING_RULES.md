# Point-of-Sale Sale Blocking Rules & Statutory Guidance

## Statutory Directives Matrix

| Block Reason Code | Triggering Condition | Regulatory Statutory Directive | Required Pharmacist Action |
|---|---|---|---|
| `DESTROYED` | Inscribed in Dead Batch Registry or certificate of destruction hash verified | **MANDATORY LOCKOUT**: Severe violation under CDSCO Hazardous Bio-Waste Rules. | Seize physical units immediately. Report hazardous re-entry breach to regulatory authority. |
| `RECALLED` | `is_recalled = True` or `status = RECALLED` | **STATUTORY LOCKOUT**: Active CDSCO / Manufacturer recall advisory. | Move physical stock to designated reverse logistics quarantine cage and initiate return. |
| `EXPIRED` | `expiry_date < current_date` | **SALE PROHIBITED**: Violation of CDSCO Drug Disposal Mandate § 14-B. | Quarantine physical boxes and create reverse logistics return manifest. |
| `QUARANTINED` | Batch status in `RETURN_INITIATED`, `RETURN_IN_TRANSIT`, `RECEIVED_AT_DISPOSAL` | **COMMERCIAL LOCKOUT**: Batch allocated to reverse supply chain. | Stock cannot be returned to commercial trade under any circumstances. |
| `NOT_FOUND` | Barcode or batch ID missing from National Ledger | **COUNTERFEIT SUSPICION**: Unregistered substance detected. | Do not dispense. Report counterfeit incident to health inspectorate. |
| `INSUFFICIENT_STOCK` | `available_quantity < requested_quantity` | **INVENTORY MISMATCH**: Requested units exceed verified on-shelf stock. | Adjust dispense quantity or complete physical intake of incoming delivery. |
| `NOT_OWNER` | Seller organization is not custodian | **CUSTODY MISMATCH**: Facility does not hold legal custody. | Reconcile inbound distributor consignment manifest before sale. |
| `FLAGGED_SUSPICIOUS` | `status = FLAGGED_SUSPICIOUS` | **SUSPENSION**: High AI supply-chain anomaly score. | Contact pharmacy compliance officer to verify batch provenance. |
