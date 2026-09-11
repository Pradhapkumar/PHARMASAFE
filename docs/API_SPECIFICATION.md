# REST API Specification (OpenAPI v3 Overview)
## PharmaSafe Intelligence Core Gateway

Base Path: `/api/v1`

---

## 1. Authentication & Session Endpoints (`/auth`)

### `POST /auth/login`
- **Description**: Authenticate user credentials and return JWT bearer token with assigned role.
- **Request Body**:
  ```json
  {
    "email": "manufacturer@pfizer.demo",
    "password": "password123"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer",
    "expires_in": 86400,
    "user": {
      "id": "usr_01H...",
      "email": "manufacturer@pfizer.demo",
      "full_name": "Dr. Sarah Jenkins",
      "role": "MANUFACTURER",
      "organization_id": "org_pfizer_01"
    }
  }
  ```

### `GET /auth/me`
- **Description**: Retrieve authenticated user context and permissions.
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**: User profile object.

---

## 2. Batch Lifecycle & Passport Endpoints (`/batches`)

### `POST /batches`
- **Role Required**: `MANUFACTURER`
- **Description**: Issue and catalog a new pharmaceutical batch.
- **Request Body**:
  ```json
  {
    "medicine_id": "med_amox_500",
    "batch_number": "AMX-2026-9901",
    "gtin": "08901234567890",
    "mfg_date": "2026-01-15",
    "expiry_date": "2027-01-15",
    "initial_quantity": 50000,
    "unit": "TABLET_STRIP",
    "storage_temp_min": 15.0,
    "storage_temp_max": 25.0
  }
  ```
- **Response `201 Created`**: Batch detail schema.

### `GET /batches/{id}/passport`
- **Role Required**: Any authenticated role.
- **Description**: Return full digital passport: batch metadata, full custody journey, return records, destruction certificate (if dead), and current AI risk score.
- **Response `200 OK`**:
  ```json
  {
    "batch_number": "AMX-2026-9901",
    "status": "AT_PHARMACY",
    "medicine": {
      "brand_name": "Amoxicillin 500mg",
      "generic_name": "Amoxicillin Trihydrate",
      "manufacturer_name": "Pfizer Global Supply"
    },
    "mfg_date": "2026-01-15",
    "expiry_date": "2027-01-15",
    "current_custodian": "Apex City Pharmacy",
    "custody_history": [
      {
        "stage": "MANUFACTURED",
        "actor": "Pfizer Global Supply",
        "timestamp": "2026-01-15T08:00:00Z",
        "location": "Mumbai Plant"
      }
    ],
    "ai_risk_score": 0.05,
    "is_dead_batch": false
  }
  ```

---

## 3. Medicine Verification & Scan Endpoints (`/verify`)

### `POST /verify/scan`
- **Role Required**: Open / Any Role.
- **Description**: Real-time verification for mobile scans or patient point-of-dispense checks.
- **Request Body**:
  ```json
  {
    "scanned_code": "AMX-2026-9901",
    "code_type": "QR_CODE",
    "location_latitude": 19.0760,
    "location_longitude": 72.8777,
    "device_info": "Flutter Scanner v1.0.0"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "verification_status": "AUTHENTIC", 
    "batch_number": "AMX-2026-9901",
    "is_expired": false,
    "is_recalled": false,
    "is_dead_batch_reentry": false,
    "warning_message": null,
    "medicine_name": "Amoxicillin 500mg",
    "timestamp": "2026-09-10T15:30:00Z"
  }
  ```
- *Note: If scanned batch is in `DEAD_BATCH` registry, returns `verification_status: "DEAD_BATCH_REENTRY_ALERT"` with immediate incident logging.*

---

## 4. Reverse Logistics Endpoints (`/returns`)

### `POST /returns`
- **Role Required**: `PHARMACY`, `DISTRIBUTOR`
- **Description**: Initiate a reverse logistics return for expired, recalled, or suspicious medicines.
- **Request Body**:
  ```json
  {
    "batch_id": "btc_amx_9901",
    "quantity": 250,
    "reason": "EXPIRED",
    "notes": "Passed expiry date on 2026-09-01",
    "destination_facility_id": "org_ecocare_disposal"
  }
  ```
- **Response `201 Created`**: Return request record.

### `PATCH /returns/{id}/status`
- **Role Required**: `DISTRIBUTOR`, `DISPOSAL_FACILITY`
- **Description**: Update custody transfer state during reverse shipment (`IN_TRANSIT`, `RECEIVED_AT_DISPOSAL`).

---

## 5. Destruction & Dead Batch Endpoints (`/destruction`)

### `POST /destruction/records`
- **Role Required**: `DISPOSAL_FACILITY`
- **Description**: Record certified physical destruction of a batch and automatically inscribe into Dead Batch Registry.
- **Request Body**:
  ```json
  {
    "return_id": "ret_09812",
    "batch_id": "btc_amx_9901",
    "quantity_destroyed": 250,
    "destruction_method": "HIGH_TEMP_INCINERATION_1200C",
    "witness_name": "Inspector Rajiv Verma",
    "witness_badge_id": "INSP-MH-9942",
    "facility_notes": "Denatured and incinerated per biohazard SOP",
    "evidence_media_url": "/storage/evidence/dest_btc_amx_9901.jpg"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "id": "dest_88712",
    "batch_number": "AMX-2026-9901",
    "destruction_cert_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "status": "DESTROYED_AND_REGISTERED_DEAD",
    "timestamp": "2026-09-10T16:00:00Z"
  }
  ```

### `GET /dead-batches`
- **Role Required**: `ADMIN`, `MANUFACTURER`, `REGULATOR_AUDITOR`
- **Description**: Query the immutable Dead Batch Registry with re-entry surveillance status.

---

## 6. AI Intelligence & Analytics (`/intelligence`)

### `GET /intelligence/risk-score/{batch_id}`
- **Description**: Computes composite risk score combining expiry degradation, transit anomalies, and re-entry risk.
- **Response `200 OK`**:
  ```json
  {
    "batch_id": "btc_amx_9901",
    "composite_risk_score": 0.88,
    "risk_level": "HIGH",
    "factors": {
      "expiry_risk": 0.95,
      "supply_chain_anomaly_score": 0.40,
      "reentry_risk": 0.90
    },
    "ai_explanation": "Batch is expired and present in the reverse logistics loop. High risk of diversion if unmonitored."
  }
  ```

### `POST /intelligence/online-surveillance`
- **Role Required**: `ADMIN`, `REGULATOR_AUDITOR`
- **Description**: Ingest online marketplace listings (e.g. gray market sites) and cross-reference with Dead Batch Registry.
