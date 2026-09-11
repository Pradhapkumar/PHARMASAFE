# PharmaSafe Intelligence — Database Schema Specification

## Schema Diagram (ER Architecture)
The PharmaSafe data model is designed for strict referential integrity, traceability, and high audit fidelity. Compatible with SQLite (development/demo) and PostgreSQL (production).

```
 ┌────────────────┐         ┌────────────────┐
 │ organizations  │◄──┬────┤     users      │
 └────────────────┘   │     └────────────────┘
         ▲            │              ▲
         │            │              │
 ┌───────┴────────┐   │     ┌────────┴───────┐
 │   medicines    │   │     │   audit_logs   │
 └────────────────┘   │     └────────────────┘
         ▲            │
         │            │
 ┌───────┴────────┐   │     ┌────────────────┐
 │    batches     ├───┼────►│   inventory    │
 └───────┬────────┘   │     └────────────────┘
         │            │
         ├────────────┼────►┌────────────────┐
         │            │     │     sales      │
         │            │     └────────────────┘
         │            │
         ├────────────┴────►┌────────────────┐
         │                  │return_requests │
         │                  └────────┬───────┘
         │                           │
         ├───────────────────────────┘
         ▼
 ┌───────────────────────┐
 │  destruction_records  │
 └───────────┬───────────┘
             ▼
 ┌───────────────────────┐
 │     dead_batches      │
 └───────────────────────┘
```

---

## Entity Details

### 1. `organizations`
- `id` (PK, VARCHAR 36): Unique identifier (e.g. `org_pfizer_india`).
- `name` (VARCHAR 255): Organization legal entity name.
- `org_type` (VARCHAR 50): `MANUFACTURER`, `DISTRIBUTOR`, `PHARMACY`, `DISPOSAL_FACILITY`, `REGULATOR`.
- `license_number` (VARCHAR 100): Regulatory drug license identifier.
- `address`, `city`, `state`, `pincode`, `contact_email`, `contact_phone`.
- `is_verified` (BOOLEAN): Trust certificate flag.

### 2. `users`
- `id` (PK, VARCHAR 36): Unique identifier.
- `organization_id` (FK -> organizations.id).
- `email` (VARCHAR 255, UNIQUE, INDEX).
- `hashed_password` (VARCHAR 255): Argon2 / Bcrypt secure hash.
- `full_name` (VARCHAR 255).
- `role` (VARCHAR 50): `MANUFACTURER`, `DISTRIBUTOR`, `PHARMACY`, `DISPOSAL_FACILITY`, `REGULATOR_AUDITOR`, `ADMIN`.
- `badge_id` (VARCHAR 100): Official staff badge number.
- `is_active` (BOOLEAN).

### 3. `medicines`
- `id` (PK, VARCHAR 36): Medicine catalog identifier.
- `brand_name` (VARCHAR 255).
- `generic_name` (VARCHAR 255).
- `dosage_form` (VARCHAR 100): Tablet, Capsule, Injection, Syrup.
- `strength` (VARCHAR 100): e.g. `500mg`, `250mg/5ml`.
- `manufacturer_org_id` (FK -> organizations.id).
- `therapeutic_category` (VARCHAR 100).
- `storage_temperature_min_c`, `storage_temperature_max_c`.

### 4. `batches`
- `id` (PK, VARCHAR 36): Batch primary key.
- `batch_number` (VARCHAR 100, UNIQUE, INDEX): Physical printed lot code (e.g. `B1001`).
- `gtin_barcode` (VARCHAR 14, INDEX): GS1-128 GTIN barcode.
- `medicine_id` (FK -> medicines.id).
- `manufacturer_id` (FK -> organizations.id).
- `mfg_date` (DATE).
- `expiry_date` (DATE, INDEX).
- `initial_quantity` (INTEGER).
- `current_quantity` (INTEGER).
- `unit` (VARCHAR 50): `BOX`, `VIAL`, `STRIP`.
- `status` (VARCHAR 50, INDEX): `MANUFACTURED`, `IN_DISTRIBUTION`, `AT_PHARMACY`, `EXPIRED`, `RECALLED`, `RETURN_INITIATED`, `RETURN_IN_TRANSIT`, `RECEIVED_AT_DISPOSAL`, `DEAD_BATCH`.
- `current_custodian_id` (FK -> organizations.id).
- `is_recalled` (BOOLEAN).
- `recall_reason` (TEXT).

### 5. `inventory`
- `id` (PK, VARCHAR 36): Inventory balance record.
- `organization_id` (FK -> organizations.id, INDEX).
- `batch_id` (FK -> batches.id, INDEX).
- `quantity_on_hand` (INTEGER).
- `quantity_reserved` (INTEGER).
- `location` (VARCHAR 100): Specific bin or rack identifier.
- `last_verified_at` (TIMESTAMP).

### 6. `sales`
- `id` (PK, VARCHAR 36): Sale transaction record.
- `batch_id` (FK -> batches.id, INDEX).
- `pharmacy_org_id` (FK -> organizations.id).
- `dispensed_by_user_id` (FK -> users.id).
- `quantity` (INTEGER): Number of units sold.
- `patient_reference` (VARCHAR 100): Anonymized prescription or patient ref.
- `invoice_number` (VARCHAR 100).
- `timestamp` (TIMESTAMP, INDEX).

### 7. `return_requests`
- `id` (PK, VARCHAR 36): Reverse logistics manifest record.
- `batch_id` (FK -> batches.id, INDEX).
- `initiator_org_id` (FK -> organizations.id).
- `initiator_user_id` (FK -> users.id).
- `destination_facility_id` (FK -> organizations.id).
- `quantity` (INTEGER): Number of returned units.
- `reason` (VARCHAR 50): `EXPIRED_STOCK`, `MANDATORY_RECALL`, `TAMPERED_DAMAGED`, `COLD_CHAIN_BREACH`.
- `status` (VARCHAR 50, INDEX): `INITIATED`, `IN_TRANSIT`, `RECEIVED_AT_DISPOSAL`, `COMPLETED_DESTROYED`, `REJECTED_RETURNED`.
- `tracking_code` (VARCHAR 100, UNIQUE, INDEX).
- `manifest_hash` (VARCHAR 64): Cryptographic digital handshake.
- `notes` (TEXT).

### 8. `destruction_records`
- `id` (PK, VARCHAR 36): Legal destruction certificate.
- `batch_id` (FK -> batches.id, INDEX).
- `return_id` (FK -> return_requests.id, NULLABLE).
- `facility_org_id` (FK -> organizations.id).
- `destroyed_by_user_id` (FK -> users.id).
- `quantity_destroyed` (INTEGER).
- `destruction_method` (VARCHAR 100): `HIGH_TEMP_INCINERATION_1200C`, `CHEMICAL_NEUTRALIZATION`, `AUTOCLAVE_SHREDDING`.
- `witness_name` (VARCHAR 255).
- `witness_badge_id` (VARCHAR 100).
- `certificate_sha256_hash` (VARCHAR 64, UNIQUE, INDEX).
- `certificate_url` (VARCHAR 255).
- `evidence_media_url` (VARCHAR 255).
- `facility_notes` (TEXT).
- `timestamp` (TIMESTAMP).

### 9. `dead_batches` (Dead Batch Registry)
- `id` (PK, VARCHAR 36): Immutable registry inscription.
- `batch_id` (FK -> batches.id).
- `batch_number` (VARCHAR 100, UNIQUE, INDEX).
- `gtin_barcode` (VARCHAR 14, INDEX).
- `destruction_record_id` (FK -> destruction_records.id).
- `destruction_cert_hash` (VARCHAR 64).
- `manufacturer_name` (VARCHAR 255).
- `quantity_destroyed` (INTEGER).
- `destroyed_at` (TIMESTAMP).
- `blacklisted_at` (TIMESTAMP).
- `reentry_attempts_count` (INTEGER, DEFAULT 0).
- `last_reentry_detected_at` (TIMESTAMP, NULLABLE).
- `is_actively_monitored` (BOOLEAN).

### 10. `verification_scans`
- `id` (PK, VARCHAR 36): Scan audit record.
- `batch_id` (FK -> batches.id, NULLABLE).
- `scanned_code` (VARCHAR 255, INDEX).
- `verification_status` (VARCHAR 50): `AUTHENTIC`, `EXPIRED`, `RECALLED`, `DEAD_BATCH_REENTRY_DETECTED`, `SUSPECT_COUNTERFEIT`, `INVALID_CODE`.
- `latitude`, `longitude` (FLOAT): Geolocation of scanning device.
- `device_info` (VARCHAR 255).
- `alert_details` (TEXT).
- `timestamp` (TIMESTAMP).

### 11. `alerts`
- `id` (PK, VARCHAR 36): System notification record.
- `alert_type` (VARCHAR 50): `DEAD_BATCH_REENTRY`, `NEAR_EXPIRY`, `BATCH_RECALL`, `QUANTITY_DISCREPANCY`, `COLD_CHAIN_EXCURSION`, `UNAUTHORIZED_DISPENSE_ATTEMPT`.
- `severity` (VARCHAR 20): `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`.
- `title` (VARCHAR 255).
- `message` (TEXT).
- `entity_type` (VARCHAR 50): `BATCH`, `RETURN`, `SALE`, `DESTRUCTION`.
- `entity_id` (VARCHAR 36).
- `is_read` (BOOLEAN, DEFAULT FALSE).
- `is_resolved` (BOOLEAN, DEFAULT FALSE).
- `created_at` (TIMESTAMP).

### 12. `audit_logs`
- `id` (PK, VARCHAR 36): Immutable ledger log.
- `action` (VARCHAR 100).
- `entity_type` (VARCHAR 50).
- `entity_id` (VARCHAR 36).
- `actor_user_id` (VARCHAR 36).
- `actor_role` (VARCHAR 50).
- `details` (TEXT).
- `timestamp` (TIMESTAMP).
