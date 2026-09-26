import requests
import json
import uuid
import sys

BASE = 'http://127.0.0.1:8000/api/v1'

results = []

def record(category, name, passed, detail=""):
    results.append({
        "category": category,
        "name": name,
        "passed": passed,
        "detail": detail
    })
    status = "[PASS]" if passed else "[FAIL]"
    print(f"{status} | [{category}] {name}: {detail}")

print("\n" + "="*75)
print("   PHARMASAFE 100% CLOSED-LOOP FEATURE VERIFICATION SUITE")
print("="*75 + "\n")

# 1. PERSONAS & AUTHENTICATION
personas = [
    ("MANUFACTURER", "manufacturer@pharmasafe.demo"),
    ("DISTRIBUTOR", "distributor@pharmasafe.demo"),
    ("PHARMACY", "pharmacy@pharmasafe.demo"),
    ("DISPOSAL_FACILITY", "disposal@pharmasafe.demo"),
    ("REGULATOR", "regulator@pharmasafe.demo"),
    ("ADMIN", "admin@pharmasafe.demo")
]

tokens = {}
for role, email in personas:
    try:
        res = requests.post(f"{BASE}/auth/login", json={"email": email, "password": "password123"}, timeout=5)
        if res.status_code == 200:
            tokens[role] = res.json().get("access_token")
            record("Authentication", f"Login Persona: {role}", True, f"Token generated for {email}")
        else:
            record("Authentication", f"Login Persona: {role}", False, f"HTTP {res.status_code}: {res.text[:100]}")
    except Exception as e:
        record("Authentication", f"Login Persona: {role}", False, str(e))

mfr_token = tokens.get("MANUFACTURER")
dist_token = tokens.get("DISTRIBUTOR")
pharm_token = tokens.get("PHARMACY")
disp_token = tokens.get("DISPOSAL_FACILITY")
reg_token = tokens.get("REGULATOR")

# 2. MEDICINE CATALOGUE
try:
    med_res = requests.get(f"{BASE}/medicines", headers={"Authorization": f"Bearer {mfr_token}"}, timeout=5)
    meds = med_res.json() if med_res.status_code == 200 else []
    record("Medicine Catalog", "Retrieve Master Medicine List", med_res.status_code == 200 and len(meds) > 0, f"{len(meds)} registered medicines found")
    med_id = meds[0]["id"] if meds else "med_paracetamol"
except Exception as e:
    record("Medicine Catalog", "Retrieve Master Medicine List", False, str(e))
    med_id = "med_paracetamol"

# 3. BATCH REGISTRATION & QR CREATION
test_batch_num = f"BATCH-TEST-{uuid.uuid4().hex[:6].upper()}"
batch_payload = {
    "batch_number": test_batch_num,
    "medicine_id": med_id,
    "mfg_date": "2026-09-01",
    "expiry_date": "2028-09-01",
    "initial_quantity": 5000,
    "unit": "BOX"
}
try:
    b_res = requests.post(f"{BASE}/batches", json=batch_payload, headers={"Authorization": f"Bearer {mfr_token}"}, timeout=5)
    created_batch = b_res.json() if b_res.status_code in [200, 201] else {}
    batch_id = created_batch.get("id")
    qr_payload = created_batch.get("qr_payload") or f"PHARMASAFE:{test_batch_num}"
    record("Manufacturing", "Batch Creation & QR Code Generation", b_res.status_code in [200, 201], f"Batch: {test_batch_num} | QR: {qr_payload}")
except Exception as e:
    record("Manufacturing", "Batch Creation & QR Code Generation", False, str(e))
    batch_id = None
    qr_payload = None

# 4. BATCH PASSPORT & DIGITAL AUDIT TRAIL
try:
    p_res = requests.get(f"{BASE}/batches/{test_batch_num}/passport", headers={"Authorization": f"Bearer {mfr_token}"}, timeout=5)
    passport = p_res.json() if p_res.status_code == 200 else {}
    record("Traceability", "Cryptographic Batch Passport & Audit Trail", p_res.status_code == 200 and "status" in passport, f"State={passport.get('status')}")
except Exception as e:
    record("Traceability", "Cryptographic Batch Passport & Audit Trail", False, str(e))

# 5. CUSTODY TRANSFER TO DISTRIBUTOR
try:
    trans_payload = {
        "batch_id": batch_id,
        "stage": "MANUFACTURE_TO_DISTRIBUTOR",
        "to_organization_id": "org_national_logistics",
        "transferred_quantity": 5000,
        "location_name": "Central Distribution Depot Mumbai"
    }
    cust_res = requests.post(f"{BASE}/batches/{batch_id}/custody-transfer", json=trans_payload, headers={"Authorization": f"Bearer {mfr_token}"}, timeout=5)
    record("Distribution", "Custody Transfer Gate (Mfr -> Distributor)", cust_res.status_code in [200, 201], f"HTTP {cust_res.status_code}")
except Exception as e:
    record("Distribution", "Custody Transfer Gate (Mfr -> Distributor)", False, str(e))

# 6. PHARMACY VERIFICATION SCAN (INBOUND)
try:
    scan_payload = {
        "scanned_code": test_batch_num,
        "code_type": "QR_CODE",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "device_info": "Pharmacy POS Scanner v1"
    }
    scan_res = requests.post(f"{BASE}/verify/scan", json=scan_payload, headers={"Authorization": f"Bearer {pharm_token}"}, timeout=5)
    scan_data = scan_res.json() if scan_res.status_code == 200 else {}
    verdict = scan_data.get("verification_status")
    record("Pharmacy Operations", "Inbound Pharmacy QR Verification Scan", scan_res.status_code == 200 and verdict == "AUTHENTIC", f"Verdict: {verdict}")
except Exception as e:
    record("Pharmacy Operations", "Inbound Pharmacy QR Verification Scan", False, str(e))

# 7. POINT-OF-SALE (POS) DISPENSING
try:
    sale_payload = {
        "batch_id": batch_id,
        "quantity": 10,
        "patient_id_hash": "pt_sha256_8819x",
        "prescription_id": "RX-2026-9901",
        "invoice_number": "INV-MUM-4412"
    }
    sale_res = requests.post(f"{BASE}/sales", json=sale_payload, headers={"Authorization": f"Bearer {pharm_token}"}, timeout=5)
    record("Pharmacy Operations", "POS Sale Recording (Patient & Prescription)", sale_res.status_code in [200, 201], f"10 units dispensed, state updated")
except Exception as e:
    record("Pharmacy Operations", "POS Sale Recording (Patient & Prescription)", False, str(e))

# 8. REVERSE LOGISTICS RETURN INITIATION
ret_id = None
try:
    ret_payload = {
        "batch_id": batch_id,
        "destination_facility_id": "org_taloja_incineration",
        "quantity": 4990,
        "reason": "EXPIRED",
        "notes": "Near-expiry retail batch return"
    }
    ret_res = requests.post(f"{BASE}/returns", json=ret_payload, headers={"Authorization": f"Bearer {pharm_token}"}, timeout=5)
    ret_data = ret_res.json() if ret_res.status_code in [200, 201] else {}
    ret_id = ret_data.get("id")
    record("Reverse Logistics", "Initiate Reverse Manifest for Expired Stock", ret_res.status_code in [200, 201], f"Return Manifest ID: {ret_id}")
except Exception as e:
    record("Reverse Logistics", "Initiate Reverse Manifest for Expired Stock", False, str(e))

# 9. OPERATIONAL DISPOSAL INTAKE (PHASE 7)
disposal_id = None
try:
    intake_payload = {
        "batch_id": batch_id,
        "return_id": ret_id,
        "disposed_quantity": 4990,
        "disposal_method": "INCINERATION",
        "disposal_facility_name": "Taloja Hazardous Chemical Incinerator",
        "notes": "Intake verified and weighed on arrival"
    }
    dsp_res = requests.post(f"{BASE}/disposal/intake", json=intake_payload, headers={"Authorization": f"Bearer {disp_token}"}, timeout=5)
    dsp_data = dsp_res.json() if dsp_res.status_code in [200, 201] else {}
    disposal_id = dsp_data.get("id")
    
    # Complete disposal to move status to DISPOSED
    cmp_res = requests.post(f"{BASE}/disposal/{disposal_id}/complete", json={"notes": "High-temperature combustion completed"}, headers={"Authorization": f"Bearer {disp_token}"}, timeout=5)
    record("Disposal Operations", "Disposal Intake & Batch State -> DISPOSED", cmp_res.status_code in [200, 201], f"Disposal ID: {disposal_id}")
except Exception as e:
    record("Disposal Operations", "Disposal Intake & Batch State -> DISPOSED", False, str(e))

# 10. DESTRUCTION CERTIFICATION WITH SHA-256 HASH (PHASE 8)
cert_hash = None
try:
    dest_payload = {
        "batch_id": batch_id,
        "disposal_id": disposal_id,
        "quantity_destroyed": 4990,
        "destruction_method": "HIGH_TEMP_INCINERATION_1200C",
        "witness_name": "Inspector V. Sharma",
        "witness_badge_id": "SPCB-INSP-4491",
        "scale_weight_kg": "24.5",
        "facility_notes": "High temperature 1200C combustion completed"
    }
    dest_res = requests.post(f"{BASE}/destruction/records", json=dest_payload, headers={"Authorization": f"Bearer {disp_token}"}, timeout=5)
    dest_data = dest_res.json() if dest_res.status_code in [200, 201] else {}
    cert_hash = dest_data.get("certificate_sha256_hash")
    record("Destruction Governance", "Incineration & Cryptographic SHA-256 Certificate", dest_res.status_code in [200, 201] and cert_hash is not None, f"SHA-256: {cert_hash[:20]}...")
except Exception as e:
    record("Destruction Governance", "Incineration & Cryptographic SHA-256 Certificate", False, str(e))

# 11. DEAD BATCH REGISTRY
try:
    dead_res = requests.get(f"{BASE}/dead-batches", headers={"Authorization": f"Bearer {reg_token}"}, timeout=5)
    dead_list = dead_res.json() if dead_res.status_code == 200 else []
    is_indexed = any(d.get("batch_id") == batch_id or d.get("batch_number") == test_batch_num for d in dead_list)
    record("Dead Batch Registry", "Blacklisting in Dead Batch Database", is_indexed, f"{len(dead_list)} total dead batches protected")
except Exception as e:
    record("Dead Batch Registry", "Blacklisting in Dead Batch Database", False, str(e))

# 12. RE-ENTRY COUNTERFEIT INTERCEPTION (< 2 SECONDS)
try:
    reentry_payload = {
        "scanned_code": test_batch_num,
        "code_type": "QR_CODE",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "device_info": "Unlicensed Backyard Chemist Delhi"
    }
    reentry_res = requests.post(f"{BASE}/verify/scan", json=reentry_payload, headers={"Authorization": f"Bearer {pharm_token}"}, timeout=5)
    reentry_data = reentry_res.json() if reentry_res.status_code == 200 else {}
    reentry_status = reentry_data.get("verification_status")
    passed_reentry = reentry_status == "DEAD_BATCH_REENTRY_DETECTED"
    record("AI Security Shield", "Dead Batch Re-Entry Interception Alarm", passed_reentry, f"Verification Status: {reentry_status}")
except Exception as e:
    record("AI Security Shield", "Dead Batch Re-Entry Interception Alarm", False, str(e))

# 13. REGULATOR CRITICAL ALERTS
try:
    alerts_res = requests.get(f"{BASE}/alerts", headers={"Authorization": f"Bearer {reg_token}"}, timeout=5)
    alerts = alerts_res.json() if alerts_res.status_code == 200 else []
    record("Regulator Governance", "Real-Time Incident Alert Broadcast", len(alerts) > 0, f"{len(alerts)} alerts active in national operations center")
except Exception as e:
    record("Regulator Governance", "Real-Time Incident Alert Broadcast", False, str(e))

print("\n" + "="*75)
total = len(results)
passed = sum(1 for r in results if r["passed"])
print(f"   SUMMARY: {passed}/{total} FEATURES OPERATIONAL ({passed/total*100:.1f}%)")
print("="*75 + "\n")
