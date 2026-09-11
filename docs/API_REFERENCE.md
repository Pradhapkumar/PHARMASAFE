# PharmaSafe Intelligence — API Reference Catalog

## Base URL
`/api/v1`

---

## 1. Authentication (`/auth`)
- `POST /auth/login`
  - **Body**: `{"email": "string", "password": "string"}`
  - **Response** `200 OK`: `{"access_token": "jwt_str", "token_type": "bearer", "expires_in": 86400, "user": {...}}`
- `GET /auth/me`
  - **Headers**: `Authorization: Bearer <token>`
  - **Response** `200 OK`: User profile object.

---

## 2. Batches & Digital Passport (`/batches`)
- `GET /batches`
  - **Query Params**: `status` (optional), `limit` (default 50), `offset` (default 0)
  - **Response** `200 OK`: List of `Batch` objects.
- `POST /batches`
  - **Roles**: `MANUFACTURER`, `ADMIN`
  - **Body**: `{"batch_number": "B1001", "medicine_id": "med_...", "gtin_barcode": "...", "mfg_date": "YYYY-MM-DD", "expiry_date": "YYYY-MM-DD", "initial_quantity": 1000, "unit": "BOX"}`
  - **Response** `201 Created`: Created `Batch`.
- `GET /batches/{batch_number_or_id}/passport`
  - **Response** `200 OK`: Complete Digital Batch Passport including provenance, custody chain, audit events, and compliance verdict.
- `POST /batches/{batch_id}/recall`
  - **Roles**: `MANUFACTURER`, `REGULATOR_AUDITOR`, `ADMIN`
  - **Body**: `{"recall_reason": "string"}`
  - **Response** `200 OK`: Updated `Batch`.

---

## 3. Verification & Anti-Re-Entry Gateway (`/verify`)
- `POST /verify/scan`
  - **Body**: `{"scanned_code": "B1001", "code_type": "QR_CODE", "latitude": 12.9716, "longitude": 77.5946, "device_info": "POS Terminal 01"}`
  - **Response** `200 OK`:
    ```json
    {
      "verification_status": "AUTHENTIC | EXPIRED | RECALLED | DEAD_BATCH_REENTRY_DETECTED | UNKNOWN_NOT_FOUND",
      "batch_number": "B1001",
      "brand_name": "Paracetamol 500mg IP",
      "sale_allowed": true,
      "is_expired": false,
      "is_recalled": false,
      "is_dead_batch_reentry": false,
      "warning_message": null,
      "timestamp": "ISO8601",
      "scan_id": "scn_..."
    }
    ```

---

## 4. Sales & Dispense Gateway (`/sales`)
- `POST /sales`
  - **Roles**: `PHARMACY`, `ADMIN`
  - **Body**: `{"batch_id": "btc_...", "quantity": 2, "patient_ref": "RX-8812", "invoice_ref": "INV-2024-001"}`
  - **Response** `201 Created`:
    ```json
    {
      "allowed": true,
      "sale_id": "sal_...",
      "batch_number": "B1001",
      "units_sold": 2,
      "timestamp": "ISO8601"
    }
    ```
  - **Errors**:
    - `400 Bad Request`: When batch is expired, recalled, destroyed, or has insufficient inventory.

---

## 5. Reverse Logistics (`/returns`)
- `POST /returns`
  - **Roles**: `PHARMACY`, `DISTRIBUTOR`, `ADMIN`
  - **Body**: `{"batch_id": "btc_...", "destination_facility_id": "org_disposal_...", "quantity": 1000, "reason": "EXPIRED_STOCK", "notes": "..."}`
  - **Response** `201 Created`: Created `ReturnRequest` with generated tracking code and manifest hash.
- `GET /returns`
  - **Response** `200 OK`: List of `ReturnRequest` objects.
- `PATCH /returns/{return_id}/status`
  - **Roles**: `DISTRIBUTOR`, `DISPOSAL_FACILITY`, `ADMIN`
  - **Body**: `{"status": "IN_TRANSIT | RECEIVED_AT_DISPOSAL", "received_quantity": 980, "notes": "..."}`
  - **Response** `200 OK`: Updated `ReturnRequest`. Auto-triggers quantity discrepancy alert if received != expected.

---

## 6. Destruction & Certification (`/destruction`)
- `POST /destruction/records`
  - **Roles**: `DISPOSAL_FACILITY`, `ADMIN`
  - **Body**: `{"batch_id": "btc_...", "quantity_destroyed": 1000, "destruction_method": "HIGH_TEMP_INCINERATION_1200C", "witness_name": "Dr. V. Sharma", "witness_badge_id": "WB-9912"}`
  - **Response** `201 Created`: `DestructionRecord` with SHA-256 certificate hash and automatic dead batch inscription.
- `GET /destruction/records`
  - **Response** `200 OK`: List of certified destruction records.

---

## 7. Dead Batch Registry (`/dead-batches`)
- `GET /dead-batches`
  - **Response** `200 OK`: All permanently blacklisted batches.
- `GET /dead-batches/alerts/re-entry-incidents`
  - **Response** `200 OK`: All intercepted re-entry attempts.

---

## 8. Dashboard & Surveillance (`/dashboard`)
- `GET /dashboard/summary`
  - **Response** `200 OK`: Real database-backed KPI statistics.
- `GET /dashboard/expiry-trend`
  - **Response** `200 OK`: 6-month historical expiry velocity.
- `GET /dashboard/return-trend`
  - **Response** `200 OK`: 6-month return initiation volume.

---

## 9. Alerts (`/alerts`)
- `GET /alerts`
  - **Query Params**: `severity`, `is_read`, `limit`
  - **Response** `200 OK`: List of system alerts.
- `PATCH /alerts/{id}/read`
  - **Response** `200 OK`: Marked read.
- `GET /alerts/count/unread`
  - **Response** `200 OK`: `{"unread_total": 4, "unread_critical": 1}`.
