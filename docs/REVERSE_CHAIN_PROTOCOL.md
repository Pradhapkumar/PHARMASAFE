# Reverse Supply Chain Protocol & Handshake Standard

## Protocol Specification

The Reverse Supply Chain Protocol defines how pharmaceutical returns move through reverse custody stages while preserving absolute auditability and anti-counterfeiting controls.

### 1. Return Manifest Creation (`PHARMACY` / `DISTRIBUTOR`)
- Endpoint: `POST /api/v1/returns`
- Inputs: `batch_id` or `batch_number`, `quantity`, `reason`, `destination_facility_id`, `carrier_name`, `carrier_tracking_ref`, `driver_badge`
- Output: ReturnRequest with tracking code `TRK-REV-YYYYMMDD-XXXXXX` and SHA-256 Manifest Hash.
- Batch State Transition: `RETURN_INITIATED`

### 2. Transport Handover (`REVERSE_CARRIER`)
- Endpoint: `PATCH /api/v1/returns/{id}/status` with `status: IN_TRANSIT`
- Inputs: `carrier_name`, `carrier_tracking_ref`, `driver_badge`
- Batch State Transition: `RETURN_IN_TRANSIT`

### 3. Receiving Intake & Reconciliation (`RECEIVING_ORGANIZATION`)
- Endpoint: `PATCH /api/v1/returns/{id}/status` with `status: RECEIVED_AT_DISPOSAL` or `RECEIVED_AT_FACILITY`
- Inputs: `received_quantity`, `scale_weight_kg`, `notes`
- Discrepancy Logic: If `abs(received_quantity - quantity) > QUANTITY_DISCREPANCY_TOLERANCE`, system auto-raises `HIGH` severity `QUANTITY_DISCREPANCY` alert.
- Batch State Transition: `RECEIVED_AT_DISPOSAL`

### 4. Wholesale Routing to Disposal Facility (`DISTRIBUTOR`)
- Endpoint: `POST /api/v1/returns/{id}/route-to-disposal`
- Inputs: `disposal_facility_id`, `carrier_name`, `driver_badge`
- Batch State Transition: `RETURN_IN_TRANSIT` (Status: `ROUTED_TO_DISPOSAL`)

### 5. Thermal Incineration & Dead Registry Inscription (`DISPOSAL_FACILITY`)
- Endpoint: `POST /api/v1/destruction/records`
- Inputs: `batch_id`, `quantity_destroyed`, `destruction_method`, `witness_name`, `witness_badge_id`
- Batch State Transition: `DEAD_BATCH`, Quantity set to 0.
- Returns State Transition: `COMPLETED_DESTROYED`
