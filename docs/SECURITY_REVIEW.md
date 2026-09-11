# PharmaSafe Intelligence — Security Review

## Security Architecture Overview

**Review Date:** September 2026  
**Status:** HARDENED ✅

---

## Authentication & Authorization

### JWT Token Architecture
- Algorithm: HS256 (HMAC-SHA256) with configurable SECRET_KEY
- Token structure: sub (user ID), role (RBAC role), org_id (organization), exp (expiry)
- Default expiry: configurable via ACCESS_TOKEN_EXPIRE_MINUTES setting
- All privileged routes use HTTPBearer auto_error=False with explicit 401 responses

### RBAC Enforcement
- RoleChecker dependency validates JWT roles on every protected route
- get_current_user_payload dependency decodes and validates token
- Missing/invalid tokens return HTTP 401 Unauthorized
- Wrong role returns HTTP 403 Forbidden

---

## File Upload Security

### Extension Whitelist
Permitted extensions:
.jpg, .jpeg, .png, .webp, .pdf, .tif, .tiff, .txt, .csv, .json, .bmp

Any other extension (including .exe, .sh, .py, .js, .zip, etc.) returns HTTP 400 with "Unsupported file extension" detail.

### File Size Enforcement
Maximum evidence file size: 25 MB (25 * 1024 * 1024 bytes)
Files exceeding this limit return HTTP 413 Request Entity Too Large.

### Directory Traversal Prevention
Uploaded file names are sanitized to remove path separators and parent directory traversal sequences before storage.

---

## Evidence Immutability

Finalized evidence records (is_finalized=True) are permanently sealed.
Any attempt to DELETE a finalized evidence record returns:
- HTTP 403 Forbidden
- Detail: "Finalized compliance evidence is permanently sealed and cannot be deleted."

This protects destruction certificates, investigation evidence, and regulatory compliance records from tampering.

---

## Tamper-Evident Destruction Certificates

### Canonical Hash Construction
All destruction certificates are secured with SHA-256 using a canonical string:

PHARMASAFE_CERT_V2:batch={BATCH}:gtin={GTIN}:qty={QTY}:method={METHOD}:facility={ORG}:witness={BADGE}:ts={ISO_TIMESTAMP}:cert_id={CERT_ID}

### Hash Invariance
- Any single field change in the canonical string produces a completely different 64-character hex SHA-256 hash
- Hash comparison during certificate verification detects any tampering
- Hash mismatches return HTTP 409 with HASH_MISMATCH status

---

## Dead Batch Registry Permanence

- Dead Batch Registry entries are written on destruction certification
- No DELETE endpoint exists for Dead Batch Registry records
- Duplicate entries are prevented (HTTP 409 on second inscription attempt)
- Sale verification always checks the Dead Batch Registry — a match forces BLOCK_SALE regardless of any other condition

---

## API Security Controls

### Deterministic Safety Rules (cannot be AI-overridden)
All of the following conditions enforce BLOCK_SALE regardless of any other input:
- batch.status == EXPIRED
- batch.status == RECALLED
- batch.status == DESTROYED
- batch.status == DEAD_BATCH
- batch.status == FLAGGED_SUSPICIOUS
- batch.status == QUARANTINED / RETURN_IN_TRANSIT / RETURN_INITIATED
- DeadBatch registry entry exists for batch

### AI Decision Support Boundary
The AI ensemble engine ONLY provides:
- composite_risk_score [0.0, 1.0]
- risk_level (LOW/MEDIUM/HIGH/CRITICAL)
- reasons (plain-English explanations)
- contributing_features (SHAP-inspired attribution)
- anomalies_detected (list of detected anomalies)

The AI engine does NOT:
- Modify batch status
- Block or allow sales
- Issue alerts without human review
- Override deterministic safety rules

---

## Known Security Limitations

1. **SQLite for development** — Production deployment requires PostgreSQL/MySQL with connection pooling and TLS.
2. **File storage** — Currently uses local filesystem. Production requires object storage (S3/GCS) with access controls.
3. **JWT SECRET_KEY** — Must be rotated and managed via secrets management in production.
4. **Rate limiting** — Not implemented at API level. Production requires rate limiting middleware.
5. **HTTPS enforcement** — Dev server runs HTTP. Production must enforce HTTPS/TLS termination.
6. **No MFA** — Multi-factor authentication not implemented in this prototype phase.
