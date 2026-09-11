# Role-Based Access Control (RBAC) Matrix
## PharmaSafe Intelligence Security Specification

---

## 1. System Roles

| Role Identifier | Display Name | Typical Entity |
| :--- | :--- | :--- |
| `ADMIN` | System Administrator | Platform Operations & Security Team |
| `MANUFACTURER` | Pharmaceutical Manufacturer | Quality Control, Production & Compliance Directors |
| `DISTRIBUTOR` | Logistics & Wholesale Distributor | Warehouse Managers, Fleet Operators |
| `PHARMACY` | Dispensing Pharmacy | Registered Pharmacists, Hospital Inventory Staff |
| `DISPOSAL_FACILITY`| Authorized Disposal Facility | Environmental Destruction Officers, Certified Witnesses |
| `REGULATOR_AUDITOR`| Health & Drug Authority Regulator | FDA / CDSCO Compliance Auditors, Inspectors |

---

## 2. Granular Permissions Matrix

| API Resource / Operation | ADMIN | MANUFACTURER | DISTRIBUTOR | PHARMACY | DISPOSAL_FACILITY | REGULATOR_AUDITOR |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Auth & User Management** |
| Create / Onboard Organizations |  | ❌ | ❌ | ❌ | ❌ | ❌ |
| View Self Profile |  |  |  |  |  |  |
| **Batch Management** |
| Create New Batch | ❌ |  | ❌ | ❌ | ❌ | ❌ |
| View Batch Passport |  |  |  |  |  |  |
| Issue Batch Recall | ❌ |  | ❌ | ❌ | ❌ |  |
| Flag Batch Suspicious |  |  |  |  |  |  |
| **Verification & Scanning** |
| Point-of-Care Scan / Verification |  |  |  |  |  |  |
| View Public Medicine Info |  |  |  |  |  |  |
| **Reverse Logistics** |
| Initiate Return Request | ❌ | ❌ |  |  | ❌ | ❌ |
| Accept Reverse Custody | ❌ | ❌ |  | ❌ | ❌ | ❌ |
| View Return Status |  |  |  |  |  |  |
| **Destruction & Dead Batch** |
| Receive at Disposal Site | ❌ | ❌ | ❌ | ❌ |  | ❌ |
| Confirm Destruction & Issue Cert | ❌ | ❌ | ❌ | ❌ |  | ❌ |
| View Dead Batch Registry |  |  |  |  |  |  |
| Re-Entry Critical Alerts Feed |  |  | ❌ | ❌ | ❌ |  |
| **AI Intelligence & Audit** |
| Run Expiry Prediction |  |  |  |  | ❌ |  |
| View Anomaly Reports |  |  | ❌ | ❌ | ❌ |  |
| Ingest Online Listing Surveillance |  |  | ❌ | ❌ | ❌ |  |
| View Immutable Audit Logs |  |  | ❌ | ❌ | ❌ |  |
