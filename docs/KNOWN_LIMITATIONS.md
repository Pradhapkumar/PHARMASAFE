# PharmaSafe Intelligence — Known Limitations

## Development vs. Production Gaps

### Database
- **Current:** SQLite (single-file, no concurrent write support)
- **Production required:** PostgreSQL or MySQL with connection pooling, replication, and automated backups

### File Storage
- **Current:** Local filesystem under /storage/evidence/
- **Production required:** Object storage (AWS S3, Google Cloud Storage, or Azure Blob) with access control policies, versioning, and encryption at rest

### Secrets Management
- **Current:** SECRET_KEY in environment variable / config file
- **Production required:** HashiCorp Vault, AWS Secrets Manager, or Azure Key Vault with key rotation

### Rate Limiting
- **Current:** No API-level rate limiting
- **Production required:** Rate limiting middleware (slowapi/nginx) to prevent abuse and DoS

### HTTPS/TLS
- **Current:** Development servers use HTTP
- **Production required:** TLS termination via nginx/reverse proxy with valid SSL certificates

### Multi-Factor Authentication
- **Current:** Single-factor JWT authentication
- **Production required:** TOTP or hardware key MFA for ADMIN, DISPOSAL_FACILITY, and REGULATOR_AUDITOR roles

---

## AI Engine Scope

- The AI ensemble engine is a **rule-based prototype** with SHAP-inspired feature attribution. It is NOT a trained machine learning model.
- Risk scores are computed from deterministic feature thresholds, NOT statistical model predictions.
- The AI engine does NOT perform: predictive expiry modeling, real-time GPS tracking, mathematical fraud proofs, or legal determination of counterfeiting.
- All AI output is labeled "decision support" and requires human regulatory review before any enforcement action.

---

## Location Data Disclaimer

All geographic coordinates displayed in the geospatial analytics module are "RECORDED LOCATION" data — pre-configured addresses of registered facilities. The platform does NOT perform real-time GPS tracking of medicine shipments.

---

## Compliance Disclaimer

The platform generates **PROTOTYPE COMPLIANCE REPORTS** for decision support purposes. These reports are not automatically legally binding regulatory submissions. All reports require review and certification by qualified regulatory personnel before submission to CDSCO or other regulatory authorities.

---

## Online Safety Surveillance Scope

The online marketplace surveillance module flags listings as "possible re-entry" based on batch number matching. The platform:
- Does NOT crawl live internet pages
- Uses submitted/reported listing data
- Does NOT make legal determinations of counterfeiting or fraud
- Provides decision support intelligence for regulatory investigation teams

---

## Test Data

The seed data (seed_data.py) contains synthetic test organizations, batches, and transactions for demonstration purposes. No real patient data, real medicine batches, or real regulatory records are included.
