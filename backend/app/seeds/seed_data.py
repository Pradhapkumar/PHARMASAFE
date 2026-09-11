import hashlib
import uuid
from datetime import date, datetime, timedelta, timezone
from backend.app.core.security import get_password_hash
from backend.app.db.base import Base
from backend.app.db.session import SessionLocal, engine
from backend.app.models.user import User, Organization, RoleEnum
from backend.app.models.medicine import Medicine
from backend.app.models.batch import Batch, BatchStatusEnum, UnitEnum
from backend.app.models.inventory import Inventory
from backend.app.models.custody import CustodyTransfer, TransferStageEnum
from backend.app.models.reverse_logistics import ReturnRequest, ReturnReasonEnum, ReturnStatusEnum
from backend.app.models.disposal import DisposalRecord
from backend.app.models.destruction import DestructionRecord
from backend.app.models.dead_batch import DeadBatch
from backend.app.models.verification import VerificationScan, VerificationStatusEnum
from backend.app.models.intelligence import RiskScoreLog, OnlineSurveillanceListing, AnomalyLog, RiskLevelEnum
from backend.app.models.alert import Alert, AlertSeverity, AlertType
from backend.app.models.audit import AuditLog
from backend.app.models.evidence import (
    Evidence, EvidenceTypeEnum, EvidenceStatusEnum, OCRStatusEnum, ScreeningResultEnum
)
from backend.app.models.investigation import (
    InvestigationCase, InvestigationNote, InvestigationEvidenceLink, CasePriorityEnum, CaseStatusEnum
)



def seed_database():
    print("[INIT] Initializing Database Schema...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        print("[ORGS] Seeding Organizations across all 5 Supply Chain Roles...")
        mfg_org = Organization(
            id="org_pfizer_india",
            name="Pfizer Healthcare India Ltd.",
            role_type=RoleEnum.MANUFACTURER,
            license_number="LIC-MFG-MH-2024-9981",
            address="Plot 45, Kurla Industrial Area",
            city="Mumbai",
            country="India"
        )
        sun_org = Organization(
            id="org_sun_pharma",
            name="Sun Pharma Industries",
            role_type=RoleEnum.MANUFACTURER,
            license_number="LIC-MFG-GJ-2023-4412",
            address="Sun Pharma Road, Tandalja",
            city="Vadodara",
            country="India"
        )
        dist_org = Organization(
            id="org_apollo_logistics",
            name="Apollo National Pharma Distribution Ltd.",
            role_type=RoleEnum.DISTRIBUTOR,
            license_number="LIC-DST-DL-2023-8812",
            address="Sector 18, Transport Hub",
            city="New Delhi",
            country="India"
        )
        pharm_org = Organization(
            id="org_medplus_retail",
            name="MedPlus Central Pharmacy #104",
            role_type=RoleEnum.PHARMACY,
            license_number="LIC-RET-KA-2022-7719",
            address="100 Feet Road, Indiranagar",
            city="Bengaluru",
            country="India"
        )
        disposal_org = Organization(
            id="org_green_shield_disposal",
            name="GreenShield Bio-Hazard Incineration Facility",
            role_type=RoleEnum.DISPOSAL_FACILITY,
            license_number="LIC-ENV-DISP-TS-2021-0091",
            address="Biomedical Disposal Zone 4",
            city="Hyderabad",
            country="India"
        )
        regulator_org = Organization(
            id="org_cdsco_regulator",
            name="CDSCO Drug Regulatory Authority",
            role_type=RoleEnum.REGULATOR_AUDITOR,
            license_number="GOV-REG-CDSCO-001",
            address="FDA Bhawan, Kotla Road",
            city="New Delhi",
            country="India"
        )

        db.add_all([mfg_org, sun_org, dist_org, pharm_org, disposal_org, regulator_org])
        db.commit()

        print("[USERS] Seeding Persona Users with standard password 'password123'...")
        default_pwd_hash = get_password_hash("password123")

        users = [
            User(id="usr_mfg_01", email="manufacturer@pharmasafe.demo", hashed_password=default_pwd_hash, full_name="Dr. Rajesh Sharma (Pfizer QC)", role=RoleEnum.MANUFACTURER, organization_id=mfg_org.id),
            User(id="usr_dist_01", email="distributor@pharmasafe.demo", hashed_password=default_pwd_hash, full_name="Vikram Sethi (Apollo Logistics)", role=RoleEnum.DISTRIBUTOR, organization_id=dist_org.id),
            User(id="usr_pharm_01", email="pharmacy@pharmasafe.demo", hashed_password=default_pwd_hash, full_name="Ananya Iyer (MedPlus Pharmacist)", role=RoleEnum.PHARMACY, organization_id=pharm_org.id),
            User(id="usr_disp_01", email="disposal@pharmasafe.demo", hashed_password=default_pwd_hash, full_name="Captain David Thomas (GreenShield)", role=RoleEnum.DISPOSAL_FACILITY, organization_id=disposal_org.id),
            User(id="usr_reg_01", email="regulator@pharmasafe.demo", hashed_password=default_pwd_hash, full_name="Inspector S. K. Roy (CDSCO Auditor)", role=RoleEnum.REGULATOR_AUDITOR, organization_id=regulator_org.id),
            User(id="usr_admin_01", email="admin@pharmasafe.demo", hashed_password=default_pwd_hash, full_name="PharmaSafe Admin", role=RoleEnum.ADMIN, organization_id=None)
        ]
        db.add_all(users)
        db.commit()

        print("[MEDICINES] Seeding Medicine Master Catalog...")
        med_amox = Medicine(
            id="med_amox_500",
            brand_name="Amoxil 500mg",
            generic_name="Amoxicillin Trihydrate",
            composition="Amoxicillin IP 500mg, Excipients q.s.",
            dosage_form="Capsule",
            strength="500mg",
            manufacturer_id=mfg_org.id
        )
        # Paracetamol 500mg — the Phase 3 B1001 demo medicine
        med_paracet_500 = Medicine(
            id="med_paracet_500",
            brand_name="Paracetamol 500mg IP",
            generic_name="Paracetamol",
            composition="Paracetamol IP 500mg, Excipients q.s.",
            dosage_form="Tablet",
            strength="500mg",
            storage_temp_min="15°C",
            storage_temp_max="25°C",
            manufacturer_id=mfg_org.id
        )
        med_paracet = Medicine(
            id="med_paracet_650",
            brand_name="Dolo-650",
            generic_name="Paracetamol",
            composition="Paracetamol IP 650mg",
            dosage_form="Tablet",
            strength="650mg",
            manufacturer_id=sun_org.id
        )
        med_azith = Medicine(
            id="med_azith_250",
            brand_name="Azithral 250",
            generic_name="Azithromycin",
            composition="Azithromycin Dihydrate IP 250mg",
            dosage_form="Tablet",
            strength="250mg",
            manufacturer_id=sun_org.id
        )
        med_remdes = Medicine(
            id="med_remdes_100",
            brand_name="Remdec 100mg",
            generic_name="Remdesivir",
            composition="Remdesivir Lyophilized Powder 100mg",
            dosage_form="Injection / Vial",
            strength="100mg/vial",
            manufacturer_id=mfg_org.id
        )
        db.add_all([med_amox, med_paracet_500, med_paracet, med_azith, med_remdes])
        db.commit()

        print("[BATCHES] Seeding Batches across Full Lifecycle Stages...")
        today = date.today()

        # ---- B1001: Phase 3 Demo Batch — Paracetamol 500mg ----
        btc_b1001 = Batch(
            id="btc_b1001_paracet",
            batch_number="B1001",
            gtin_barcode="8901088001001",
            medicine_id=med_paracet_500.id,
            manufacturer_id=mfg_org.id,
            mfg_date=today - timedelta(days=30),
            expiry_date=today + timedelta(days=720),  # 2 years shelf life
            initial_quantity=20000,
            current_quantity=18500,
            unit=UnitEnum.TABLET_STRIP,
            status=BatchStatusEnum.AT_PHARMACY,
            current_custodian_id=pharm_org.id,
            qr_payload="PHARMASAFE:B1001:8901088001001"
        )

        # Batch 1: ACTIVE (Healthy Amoxicillin in Pharmacy)
        btc_active = Batch(
            id="btc_amx_active_01",
            batch_number="AMX-2026-001",
            gtin_barcode="8901088019912",
            medicine_id=med_amox.id,
            manufacturer_id=mfg_org.id,
            mfg_date=today - timedelta(days=60),
            expiry_date=today + timedelta(days=500),
            initial_quantity=10000,
            current_quantity=9200,
            unit=UnitEnum.BOX,
            status=BatchStatusEnum.AT_PHARMACY,
            current_custodian_id=pharm_org.id,
            qr_payload="PHARMASAFE:AMX-2026-001:8901088019912"
        )

        # Batch 2: EXPIRED
        btc_expired = Batch(
            id="btc_azt_expired_02",
            batch_number="AZT-2025-EXP",
            gtin_barcode="8902099028821",
            medicine_id=med_azith.id,
            manufacturer_id=sun_org.id,
            mfg_date=today - timedelta(days=750),
            expiry_date=today - timedelta(days=20),
            initial_quantity=5000,
            current_quantity=450,
            unit=UnitEnum.TABLET_STRIP,
            status=BatchStatusEnum.EXPIRED,
            current_custodian_id=pharm_org.id,
            qr_payload="PHARMASAFE:AZT-2025-EXP:8902099028821"
        )

        # Batch 3: RECALLED
        btc_recalled = Batch(
            id="btc_rmd_recall_03",
            batch_number="RMD-2026-REC",
            gtin_barcode="8903077037734",
            medicine_id=med_remdes.id,
            manufacturer_id=mfg_org.id,
            mfg_date=today - timedelta(days=90),
            expiry_date=today + timedelta(days=280),
            initial_quantity=2000,
            current_quantity=1800,
            unit=UnitEnum.VIAL,
            status=BatchStatusEnum.RECALLED,
            current_custodian_id=dist_org.id,
            is_recalled=True,
            recall_reason="Microbial seal compromise flagged in Lot #4 testing",
            recall_date=datetime.now(timezone.utc) - timedelta(days=2),
            qr_payload="PHARMASAFE:RMD-2026-REC:8903077037734"
        )

        # Batch 4: RETURN_IN_TRANSIT
        btc_in_transit = Batch(
            id="btc_par_return_04",
            batch_number="PAR-2026-REV",
            gtin_barcode="8904066046645",
            medicine_id=med_paracet.id,
            manufacturer_id=sun_org.id,
            mfg_date=today - timedelta(days=400),
            expiry_date=today - timedelta(days=5),
            initial_quantity=15000,
            current_quantity=800,
            unit=UnitEnum.BOX,
            status=BatchStatusEnum.RETURN_IN_TRANSIT,
            current_custodian_id=dist_org.id,
            qr_payload="PHARMASAFE:PAR-2026-REV:8904066046645"
        )

        # Batch 5: OFFICIALLY DESTROYED & INSCRIBED DEAD BATCH
        btc_dead = Batch(
            id="btc_amx_dead_05",
            batch_number="AMX-2024-DEAD-01",
            gtin_barcode="8901088014499",
            medicine_id=med_amox.id,
            manufacturer_id=mfg_org.id,
            mfg_date=today - timedelta(days=900),
            expiry_date=today - timedelta(days=180),
            initial_quantity=8000,
            current_quantity=0,
            unit=UnitEnum.BOX,
            status=BatchStatusEnum.DEAD_BATCH,
            current_custodian_id=disposal_org.id,
            qr_payload="PHARMASAFE:AMX-2024-DEAD-01:8901088014499"
        )

        # Batch B1003: EXPIRED (Alias for AZT-2025-EXP)
        btc_b1003 = Batch(
            id="btc_b1003_expired",
            batch_number="B1003",
            gtin_barcode="8901088001003",
            medicine_id=med_azith.id,
            manufacturer_id=sun_org.id,
            mfg_date=today - timedelta(days=750),
            expiry_date=today - timedelta(days=20),
            initial_quantity=5000,
            current_quantity=450,
            unit=UnitEnum.TABLET_STRIP,
            status=BatchStatusEnum.EXPIRED,
            current_custodian_id=pharm_org.id,
            qr_payload="PHARMASAFE:B1003:8901088001003"
        )

        # Batch B1004: RECALLED (Alias for RMD-2026-REC)
        btc_b1004 = Batch(
            id="btc_b1004_recalled",
            batch_number="B1004",
            gtin_barcode="8901088001004",
            medicine_id=med_remdes.id,
            manufacturer_id=mfg_org.id,
            mfg_date=today - timedelta(days=90),
            expiry_date=today + timedelta(days=280),
            initial_quantity=2000,
            current_quantity=1800,
            unit=UnitEnum.VIAL,
            status=BatchStatusEnum.RECALLED,
            current_custodian_id=dist_org.id,
            is_recalled=True,
            recall_reason="Microbial seal compromise flagged in Lot #4 testing",
            recall_date=datetime.now(timezone.utc) - timedelta(days=2),
            qr_payload="PHARMASAFE:B1004:8901088001004"
        )

        # Batch B9001: DESTROYED & DEAD BATCH (Alias for AMX-2024-DEAD-01)
        btc_b9001 = Batch(
            id="btc_b9001_dead",
            batch_number="B9001",
            gtin_barcode="8901088009001",
            medicine_id=med_amox.id,
            manufacturer_id=mfg_org.id,
            mfg_date=today - timedelta(days=900),
            expiry_date=today - timedelta(days=180),
            initial_quantity=8000,
            current_quantity=0,
            unit=UnitEnum.BOX,
            status=BatchStatusEnum.DEAD_BATCH,
            current_custodian_id=disposal_org.id,
            qr_payload="PHARMASAFE:B9001:8901088009001"
        )

        db.add_all([btc_b1001, btc_active, btc_expired, btc_recalled, btc_in_transit, btc_dead, btc_b1003, btc_b1004, btc_b9001])
        db.commit()

        print("[INVENTORY] Seeding Inventory Records for Active Batches...")
        # B1001 inventory at manufacturer then pharmacy
        inv_b1001_mfg = Inventory(
            id="inv_b1001_mfg",
            organization_id=mfg_org.id,
            batch_id=btc_b1001.id,
            quantity_received=20000,
            quantity_available=0,       # fully shipped out
            quantity_quarantined=0,
        )
        inv_b1001_pharm = Inventory(
            id="inv_b1001_pharm",
            organization_id=pharm_org.id,
            batch_id=btc_b1001.id,
            quantity_received=18500,
            quantity_available=18500,
            quantity_quarantined=0,
        )
        # AMX-2026-001 at pharmacy
        inv_amx_pharm = Inventory(
            id="inv_amx_pharm",
            organization_id=pharm_org.id,
            batch_id=btc_active.id,
            quantity_received=9200,
            quantity_available=9200,
            quantity_quarantined=0,
        )
        # Expired batch at pharmacy (quarantined, not available)
        inv_azt_pharm = Inventory(
            id="inv_azt_pharm",
            organization_id=pharm_org.id,
            batch_id=btc_expired.id,
            quantity_received=450,
            quantity_available=0,
            quantity_quarantined=450,
        )
        db.add_all([inv_b1001_mfg, inv_b1001_pharm, inv_amx_pharm, inv_azt_pharm])
        db.commit()

        print("[CUSTODY] Seeding Custody Transfers & Chain of Custody...")
        # B1001: Manufacturer → Distributor → Pharmacy
        trn_b1001_1 = CustodyTransfer(
            id="trn_b1001_01",
            batch_id=btc_b1001.id,
            stage=TransferStageEnum.MANUFACTURE_TO_DISTRIBUTOR,
            from_organization_id=mfg_org.id,
            to_organization_id=dist_org.id,
            transferred_quantity=20000,
            verified_quantity=20000,
            latitude=19.0760,
            longitude=72.8777,
            location_name="Mumbai Plant Hub",
            digital_signature="SIG-PZER-B1001-DIST",
            timestamp=datetime.now(timezone.utc) - timedelta(days=25)
        )
        trn_b1001_2 = CustodyTransfer(
            id="trn_b1001_02",
            batch_id=btc_b1001.id,
            stage=TransferStageEnum.DISTRIBUTOR_TO_PHARMACY,
            from_organization_id=dist_org.id,
            to_organization_id=pharm_org.id,
            transferred_quantity=18500,
            verified_quantity=18500,
            latitude=12.9716,
            longitude=77.5946,
            location_name="Bengaluru MedPlus Hub",
            digital_signature="SIG-APLO-B1001-PHARM",
            timestamp=datetime.now(timezone.utc) - timedelta(days=18)
        )
        # AMX-2026-001 custody
        trn1 = CustodyTransfer(
            id="trn_001",
            batch_id=btc_active.id,
            stage=TransferStageEnum.MANUFACTURE_TO_DISTRIBUTOR,
            from_organization_id=mfg_org.id,
            to_organization_id=dist_org.id,
            transferred_quantity=10000,
            verified_quantity=10000,
            latitude=19.0760,
            longitude=72.8777,
            location_name="Mumbai Plant Hub",
            digital_signature="SIG-MFG-9981-DIST",
            timestamp=datetime.now(timezone.utc) - timedelta(days=50)
        )
        trn2 = CustodyTransfer(
            id="trn_002",
            batch_id=btc_active.id,
            stage=TransferStageEnum.DISTRIBUTOR_TO_PHARMACY,
            from_organization_id=dist_org.id,
            to_organization_id=pharm_org.id,
            transferred_quantity=10000,
            verified_quantity=10000,
            latitude=12.9716,
            longitude=77.5946,
            location_name="Bengaluru MedPlus Hub",
            digital_signature="SIG-DIST-8812-PHARM",
            timestamp=datetime.now(timezone.utc) - timedelta(days=40)
        )
        db.add_all([trn_b1001_1, trn_b1001_2, trn1, trn2])

        print("[RETURNS] Seeding Reverse Logistics Return Requests...")
        ret_req = ReturnRequest(
            id="ret_par_001",
            batch_id=btc_in_transit.id,
            initiator_org_id=pharm_org.id,
            initiator_user_id="usr_pharm_01",
            destination_facility_id=disposal_org.id,
            quantity=800,
            reason=ReturnReasonEnum.EXPIRED,
            status=ReturnStatusEnum.IN_TRANSIT,
            tracking_code="TRK-REV-2026-88910",
            notes="Expired stock collected from Indiranagar shelf. Dispatched via Apollo Reverse Carrier.",
            created_at=datetime.now(timezone.utc) - timedelta(days=3)
        )
        db.add(ret_req)

        disp_rec = DisposalRecord(
            id="dsp_rec_001",
            batch_id=btc_b1001.id,
            return_id=ret_req.id,
            facility_org_id=disposal_org.id,
            operator_user_id="usr_disp_01",
            disposed_quantity=1000,
            disposal_method="HIGH_TEMP_INCINERATION_1200C",
            scale_weight_kg="42.50 kg",
            evidence_media_url="/storage/evidence/disposal/apex_scale_calibration_42_5kg.jpg",
            status="DISPOSED",
            notes="Processed under 1200C thermal destruction chamber. Tare calibrated scale verified.",
            timestamp=datetime.now(timezone.utc) - timedelta(days=10)
        )
        db.add(disp_rec)


        print("[DESTRUCTION] Seeding Certified Destruction Record & Dead Batch Registry...")
        dest_time = datetime.now(timezone.utc) - timedelta(days=30)
        dest_cert_payload = f"PHARMASAFE_CERT:{btc_dead.batch_number}:{btc_dead.gtin_barcode}:8000:HIGH_TEMP_INCINERATION_1200C:INSP-TS-9942:{dest_time.isoformat()}"
        dest_cert_hash = hashlib.sha256(dest_cert_payload.encode()).hexdigest()

        dest_rec = DestructionRecord(
            id="dst_dead_001",
            batch_id=btc_dead.id,
            return_id=None,
            facility_org_id=disposal_org.id,
            destroyed_by_user_id="usr_disp_01",
            quantity_destroyed=8000,
            destruction_method="HIGH_TEMP_INCINERATION_1200C",
            witness_name="Inspector Rajiv Verma",
            witness_badge_id="INSP-TS-9942",
            certificate_sha256_hash=dest_cert_hash,
            certificate_url=f"/certificates/{dest_cert_hash}.pdf",
            evidence_media_url="/storage/evidence/destruction_amx_dead_01.jpg",
            facility_notes="Complete thermal decomposition verified at 1200C chamber.",
            timestamp=dest_time
        )
        db.add(dest_rec)

        dead_entry = DeadBatch(
            id="ded_dead_001",
            batch_id=btc_dead.id,
            batch_number=btc_dead.batch_number,
            gtin_barcode=btc_dead.gtin_barcode,
            destruction_record_id=dest_rec.id,
            destruction_cert_hash=dest_cert_hash,
            manufacturer_name=mfg_org.name,
            quantity_destroyed=8000,
            destroyed_at=dest_time,
            blacklisted_at=dest_time,
            reentry_attempts_count=1,
            last_reentry_detected_at=datetime.now(timezone.utc) - timedelta(days=2),
            is_actively_monitored=True
        )
        db.add(dead_entry)

        print("[SCANS] Seeding Re-Entry Attempt Scan on Dead Batch...")
        reentry_scan = VerificationScan(
            id="scn_reentry_alert_001",
            scanned_code=btc_dead.batch_number,
            code_type="QR_CODE",
            batch_id=btc_dead.id,
            batch_number=btc_dead.batch_number,
            verification_status=VerificationStatusEnum.DEAD_BATCH_REENTRY_DETECTED,
            is_critical_alert=True,
            alert_details=f"CRITICAL RE-ENTRY ALERT: Destroyed batch {btc_dead.batch_number} was scanned at unauthorized retail counter.",
            latitude=28.6139,
            longitude=77.2090,
            device_info="Suspect Retail App v2.1",
            timestamp=datetime.now(timezone.utc) - timedelta(days=2)
        )
        db.add(reentry_scan)

        print("[SURVEILLANCE] Seeding Online Marketplace Gray Market Surveillance Alert...")
        online_listing = OnlineSurveillanceListing(
            id="lst_telegram_001",
            platform_name="TelegramGroup_PharmaDirectRx",
            listing_url="https://t.me/pharmadirect_deals/9044",
            seller_name="FastMeds_Wholesale",
            seller_identifier="TG_SELLER_@fastmeds99",
            medicine_brand_claimed="Amoxil 500mg",
            extracted_batch_number=btc_dead.batch_number,
            listed_price_inr=150.0,
            discount_percentage=70.0,
            is_dead_batch_match=True,
            risk_score=1.0,
            risk_level=RiskLevelEnum.CRITICAL,
            flagged_reasons="CRITICAL: E-commerce listing features batch number 'AMX-2024-DEAD-01' from Dead Batch Registry. Deep 70% discount on illicit channel."
        )
        db.add(online_listing)

        print("[ALERTS] Seeding Initial System Alerts...")
        alert1 = Alert(
            id="alr_reentry_001",
            alert_type=AlertType.DEAD_BATCH_REENTRY,
            severity=AlertSeverity.CRITICAL,
            title="CRITICAL: Dead Batch Re-Entry Detected",
            message=f"Destroyed batch {btc_dead.batch_number} was scanned at an unauthorized retail location. Cert hash: {dest_cert_hash[:16]}...",
            entity_type="BATCH",
            entity_id=btc_dead.id,
            is_read=False,
            is_resolved=False,
        )
        alert2 = Alert(
            id="alr_recall_001",
            alert_type=AlertType.RECALL_ISSUED,
            severity=AlertSeverity.HIGH,
            title=f"Recall Issued: {btc_recalled.batch_number}",
            message=f"Mandatory safety recall issued for batch {btc_recalled.batch_number}. Reason: {btc_recalled.recall_reason}",
            entity_type="BATCH",
            entity_id=btc_recalled.id,
            is_read=False,
            is_resolved=False,
        )
        alert3 = Alert(
            id="alr_surveillance_001",
            alert_type=AlertType.SUSPICIOUS_LISTING,
            severity=AlertSeverity.CRITICAL,
            title="Gray Market Listing: Destroyed Batch Detected Online",
            message=f"Online listing on TelegramGroup_PharmaDirectRx matches Dead Batch {btc_dead.batch_number}. 70% discount — high re-entry risk.",
            entity_type="BATCH",
            entity_id=btc_dead.id,
            is_read=False,
            is_resolved=False,
        )
        alert4 = Alert(
            id="alr_near_expiry_001",
            alert_type=AlertType.NEAR_EXPIRY_WARNING,
            severity=AlertSeverity.MEDIUM,
            title="Near Expiry Warning: Check Pharmacy Stock",
            message="AZT-2025-EXP (Azithral 250) has already expired and remains in pharmacy inventory. Initiate return immediately.",
            entity_type="BATCH",
            entity_id=btc_expired.id,
            is_read=False,
            is_resolved=False,
        )
        db.add_all([alert1, alert2, alert3, alert4])

        print("[AI_RISK] Seeding Initial AI Risk Scores & Audit Trail...")
        risk_b1001 = RiskScoreLog(
            id="rsk_b1001",
            batch_id=btc_b1001.id,
            composite_risk_score=0.06,
            risk_level=RiskLevelEnum.LOW,
            expiry_risk_score=0.02,
            supply_chain_anomaly_score=0.04,
            reentry_risk_score=0.02,
            explanation_summary="B1001 Paracetamol 500mg: 720-day shelf life, complete chain of custody, no anomalies.",
            timestamp=datetime.now(timezone.utc)
        )
        risk_active = RiskScoreLog(
            id="rsk_001",
            batch_id=btc_active.id,
            composite_risk_score=0.08,
            risk_level=RiskLevelEnum.LOW,
            expiry_risk_score=0.04,
            supply_chain_anomaly_score=0.05,
            reentry_risk_score=0.05,
            explanation_summary="Batch has 500 days shelf life and complete custody integrity.",
            timestamp=datetime.now(timezone.utc)
        )
        risk_dead = RiskScoreLog(
            id="rsk_002",
            batch_id=btc_dead.id,
            composite_risk_score=1.0,
            risk_level=RiskLevelEnum.CRITICAL,
            expiry_risk_score=1.0,
            supply_chain_anomaly_score=0.90,
            reentry_risk_score=1.0,
            explanation_summary="CRITICAL: Batch is inscribed in Dead Batch Registry and actively scanned in illicit market.",
            timestamp=datetime.now(timezone.utc)
        )
        db.add_all([risk_b1001, risk_active, risk_dead])

        print("[PHASE_11] Seeding Phase 11 Evidence Records, Integrity Checksums & Investigation Cases...")
        # Evidence 1: B1001 Packaging Label with OCR Match
        ev1 = Evidence(
            id="ev_b1001_pkg",
            evidence_id="EV-2026-B1001-01",
            entity_type="BATCH",
            entity_id="B1001",
            batch_id=btc_b1001.id,
            evidence_type=EvidenceTypeEnum.PACKAGING_IMAGE,
            file_name="b1001_primary_packaging_label.jpg",
            file_type="image/jpeg",
            file_size=348291,
            storage_reference="/storage/evidence/batch/b1001_primary_packaging_label.jpg",
            checksum="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            checksum_algorithm="SHA-256",
            uploaded_by_id="usr_pharm_01",
            organization_id=pharm_org.id,
            description="Point-of-care packaging photo captured during pharmacy receiving verification scan.",
            status=EvidenceStatusEnum.ACTIVE,
            is_finalized=True,
            ocr_status=OCRStatusEnum.MATCH,
            ocr_extracted_data={
                "batch_number": "B1001",
                "product_name": "Paracetamol 500mg",
                "expiry_date": "2028-09-10",
                "manufacturer": "Pfizer Healthcare India Ltd.",
                "quantity": 20000
            },
            ocr_confidence=96,
            screening_result=ScreeningResultEnum.NO_OBVIOUS_ANOMALY,
            screening_details={"blur_score": 112.4, "quality_score": 95.0, "recommendation": "SATISFACTORY_SCREENING"},
            created_at=datetime.now(timezone.utc) - timedelta(days=60)
        )

        # Evidence 2: Return Manifest RTN-1001
        ev2 = Evidence(
            id="ev_b1001_rtn",
            evidence_id="EV-2026-B1001-02",
            entity_type="RETURN",
            entity_id="RTN-1001",
            batch_id=btc_b1001.id,
            return_id=ret_req.id,
            evidence_type=EvidenceTypeEnum.DOCUMENT,
            file_name="return_manifest_rtn_1001.pdf",
            file_type="application/pdf",
            file_size=1048576,
            storage_reference="/storage/evidence/return/return_manifest_rtn_1001.pdf",
            checksum="9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
            checksum_algorithm="SHA-256",
            uploaded_by_id="usr_dist_01",
            organization_id=dist_org.id,
            description="Signed reverse logistics chain-of-custody transfer manifest from MedPlus to Apollo Logistics.",
            status=EvidenceStatusEnum.ACTIVE,
            is_finalized=True,
            ocr_status=OCRStatusEnum.MATCH,
            ocr_extracted_data={"batch_number": "B1001", "return_id": "RTN-1001", "quantity": 1000},
            ocr_confidence=92,
            screening_result=ScreeningResultEnum.NO_OBVIOUS_ANOMALY,
            created_at=datetime.now(timezone.utc) - timedelta(days=20)
        )

        # Evidence 3: Scale Calibration & Intake Photo at Apex Disposal
        ev3 = Evidence(
            id="ev_b1001_dsp",
            evidence_id="EV-2026-B1001-03",
            entity_type="DISPOSAL",
            entity_id="DSP-1001",
            batch_id=btc_b1001.id,
            disposal_id=disp_rec.id,
            evidence_type=EvidenceTypeEnum.WEIGHT_RECORD,
            file_name="apex_scale_calibration_42_5kg.jpg",
            file_type="image/jpeg",
            file_size=512000,
            storage_reference="/storage/evidence/disposal/apex_scale_calibration_42_5kg.jpg",
            checksum="5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
            checksum_algorithm="SHA-256",
            uploaded_by_id="usr_disp_01",
            organization_id=disposal_org.id,
            description="Certified scale tare calibration certificate and intake pallet weight record (42.50 kg).",
            status=EvidenceStatusEnum.ACTIVE,
            is_finalized=True,
            ocr_status=OCRStatusEnum.MATCH,
            ocr_extracted_data={"batch_number": "B1001", "scale_weight_kg": "42.50 kg", "facility": "Apex Eco-Disposal Plant A"},
            ocr_confidence=94,
            screening_result=ScreeningResultEnum.NO_OBVIOUS_ANOMALY,
            created_at=datetime.now(timezone.utc) - timedelta(days=10)
        )

        # Evidence 4: Destruction Certificate DC-1001
        ev4 = Evidence(
            id="ev_b1001_cert",
            evidence_id="EV-2026-B1001-04",
            entity_type="CERTIFICATE",
            entity_id="DC-1001",
            batch_id=btc_b1001.id,
            certificate_id=dest_rec.id,
            evidence_type=EvidenceTypeEnum.CERTIFICATE,
            file_name="destruction_certificate_dc_1001_sealed.pdf",
            file_type="application/pdf",
            file_size=2097152,
            storage_reference="/storage/evidence/destruction/destruction_certificate_dc_1001_sealed.pdf",
            checksum=dest_cert_hash,
            checksum_algorithm="SHA-256",
            uploaded_by_id="usr_disp_01",
            organization_id=disposal_org.id,
            description=f"Official Multi-Party Witness Destruction Certificate. SHA-256: {dest_cert_hash}",
            status=EvidenceStatusEnum.SEALED,
            is_finalized=True,
            ocr_status=OCRStatusEnum.MATCH,
            ocr_extracted_data={
                "certificate_id": "DC-1001",
                "batch_number": "B1001",
                "quantity": 1000,
                "destruction_method": "HIGH_TEMP_INCINERATION_1200C",
                "witness": "Officer Vikram Malhotra (Badge ID: REG-INSP-8821)"
            },
            ocr_confidence=99,
            screening_result=ScreeningResultEnum.NO_OBVIOUS_ANOMALY,
            created_at=datetime.now(timezone.utc) - timedelta(days=5)
        )

        # Evidence 5: Online Marketplace Screenshot (Suspected Re-entry)
        ev5 = Evidence(
            id="ev_b1001_screen",
            evidence_id="EV-2026-B1001-05",
            entity_type="LISTING",
            entity_id="LIST-2026-001",
            batch_id=btc_b1001.id,
            evidence_type=EvidenceTypeEnum.LISTING_SCREENSHOT,
            file_name="darknet_rx_listing_b1001.png",
            file_type="image/png",
            file_size=421900,
            storage_reference="/storage/evidence/listing/darknet_rx_listing_b1001.png",
            checksum="4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
            checksum_algorithm="SHA-256",
            uploaded_by_id="usr_reg_01",
            organization_id=regulator_org.id,
            description="Forensic screen capture of unverified darknet pharmacy listing 500 units claiming authentic B1001.",
            status=EvidenceStatusEnum.FLAGGED,
            is_finalized=False,
            ocr_status=OCRStatusEnum.MATCH,
            ocr_extracted_data={"batch_number": "B1001", "price_discount": "75%", "seller": "GlobalMeds24"},
            ocr_confidence=85,
            screening_result=ScreeningResultEnum.NO_OBVIOUS_ANOMALY,
            created_at=datetime.now(timezone.utc) - timedelta(days=1)
        )

        # Evidence 6: Simulated Mismatched Package for OCR Comparison Demo
        ev6 = Evidence(
            id="ev_b1003_mismatch",
            evidence_id="EV-2026-MISMATCH-01",
            entity_type="BATCH",
            entity_id="B1003",
            evidence_type=EvidenceTypeEnum.PACKAGING_IMAGE,
            file_name="tampered_carton_sample_b1003.jpg",
            file_type="image/jpeg",
            file_size=298000,
            storage_reference="/storage/evidence/batch/tampered_carton_sample_b1003.jpg",
            checksum="ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d",
            checksum_algorithm="SHA-256",
            uploaded_by_id="usr_reg_01",
            organization_id=regulator_org.id,
            description="Sample carton with altered inkjet printing claiming B1001 but barcode encodes B1003.",
            status=EvidenceStatusEnum.FLAGGED,
            is_finalized=False,
            ocr_status=OCRStatusEnum.MISMATCH,
            ocr_extracted_data={
                "batch_number": "B1003",
                "product_name": "Paracetamol 500mg",
                "expiry_date": "2025-06-30"
            },
            ocr_confidence=91,
            screening_result=ScreeningResultEnum.POSSIBLE_PACKAGING_ANOMALY,
            screening_details={"blur_score": 78.2, "quality_score": 68.0, "notes": ["Inkjet text misalignment detected near lot code."]},
            created_at=datetime.now(timezone.utc)
        )

        db.add_all([ev1, ev2, ev3, ev4, ev5, ev6])

        # Master Demonstration Investigation Case: INV-2026-B1001
        inv_b1001 = InvestigationCase(
            id="inv_b1001_master",
            case_id="INV-2026-B1001",
            title="Forensic Investigation: Decommissioned Batch B1001 Gray-Market Re-entry Alert",
            priority=CasePriorityEnum.CRITICAL,
            status=CaseStatusEnum.UNDER_REVIEW,
            entity_type="BATCH",
            entity_id="B1001",
            batch_id=btc_b1001.id,
            assigned_to_user_id="usr_reg_01",
            assigned_to_name="Officer Vikram Malhotra (Lead Regulatory Auditor)",
            created_by_user_id="usr_reg_01",
            summary=(
                "Batch B1001 (Paracetamol 500mg) completed the full authoritative reverse chain: "
                "Pharmacy Sale Block -> Return RTN-1001 -> Apex Disposal -> Certificate DC-1001 -> "
                "Dead Batch Registry Inscription. An online darknet crawler flagged a seller (GlobalMeds24) "
                "attempting to dispense 500 units claiming lot B1001. Autonomous AI Risk Engine flagged "
                "1.0 CRITICAL Re-entry threat. Case initiated to freeze illicit channels and execute ISP legal takedown."
            ),
            findings=(
                "Physical destruction of 1,000 units was authenticated by witness badge REG-INSP-8821. "
                "The online listing is an unauthorized counterfeit cloning attempt reusing verified historical lot numbers."
            ),
            risk_level="CRITICAL",
            risk_score=1.0,
            risk_factors={
                "dead_batch_reentry_threat": 1.0,
                "darknet_channel_detected": 0.95,
                "deep_discount_anomaly": 0.75,
                "custody_provenance_integrity": 1.0
            },
            created_at=datetime.now(timezone.utc) - timedelta(days=2)
        )

        # Secondary Investigation Case: Quantity Discrepancy
        inv_shrink = InvestigationCase(
            id="inv_shrink_01",
            case_id="INV-2026-SHRINK-01",
            title="Transit Discrepancy Audit: Pune to Mumbai Route 4",
            priority=CasePriorityEnum.HIGH,
            status=CaseStatusEnum.OPEN,
            entity_type="RETURN",
            entity_id="RTN-1001",
            batch_id=btc_b1001.id,
            assigned_to_user_id="usr_dist_01",
            assigned_to_name="Rajesh Kumar (Apollo Logistics Security)",
            created_by_user_id="usr_dist_01",
            summary="Audit of minor package count variance recorded during reverse transit handover.",
            risk_level="HIGH",
            risk_score=0.78,
            created_at=datetime.now(timezone.utc) - timedelta(days=5)
        )

        # Third Investigation Case: Routine Certificate Verification
        inv_cert = InvestigationCase(
            id="inv_cert_01",
            case_id="INV-2026-CERT-01",
            title="Cryptographic Hash Attestation: Certificate DC-1001",
            priority=CasePriorityEnum.LOW,
            status=CaseStatusEnum.RESOLVED,
            entity_type="CERTIFICATE",
            entity_id="DC-1001",
            batch_id=btc_b1001.id,
            assigned_to_user_id="usr_admin_01",
            assigned_to_name="System Administrator",
            created_by_user_id="usr_admin_01",
            summary="Routine automated audit verifying SHA-256 certificate against Dead Batch sovereign ledger.",
            findings="Certificate hash verified 100% authentic. Zero tamper detected.",
            resolution_notes="Signed cryptographic attestation archived into Sovereign Audit Trail.",
            risk_level="LOW",
            risk_score=0.04,
            created_at=datetime.now(timezone.utc) - timedelta(days=8),
            closed_at=datetime.now(timezone.utc) - timedelta(days=7)
        )

        db.add_all([inv_b1001, inv_shrink, inv_cert])
        db.flush()

        # Link Evidence to Master Case INV-2026-B1001
        link1 = InvestigationEvidenceLink(
            id=str(uuid.uuid4()),
            case_id=inv_b1001.id,
            evidence_id=ev1.id,
            linked_by_id="usr_reg_01",
            relevance_notes="Original authentic dispensary label baseline.",
            linked_at=datetime.now(timezone.utc) - timedelta(days=2)
        )
        link2 = InvestigationEvidenceLink(
            id=str(uuid.uuid4()),
            case_id=inv_b1001.id,
            evidence_id=ev2.id,
            linked_by_id="usr_reg_01",
            relevance_notes="Proof of reverse chain initiation.",
            linked_at=datetime.now(timezone.utc) - timedelta(days=2)
        )
        link3 = InvestigationEvidenceLink(
            id=str(uuid.uuid4()),
            case_id=inv_b1001.id,
            evidence_id=ev3.id,
            linked_by_id="usr_reg_01",
            relevance_notes="Certified scale record at Apex Eco-Disposal.",
            linked_at=datetime.now(timezone.utc) - timedelta(days=2)
        )
        link4 = InvestigationEvidenceLink(
            id=str(uuid.uuid4()),
            case_id=inv_b1001.id,
            evidence_id=ev4.id,
            linked_by_id="usr_reg_01",
            relevance_notes="Authoritative Destruction Certificate DC-1001.",
            linked_at=datetime.now(timezone.utc) - timedelta(days=2)
        )
        link5 = InvestigationEvidenceLink(
            id=str(uuid.uuid4()),
            case_id=inv_b1001.id,
            evidence_id=ev5.id,
            linked_by_id="usr_reg_01",
            relevance_notes="Illicit marketplace screenshot showing attempted resurrection.",
            linked_at=datetime.now(timezone.utc) - timedelta(days=1)
        )
        db.add_all([link1, link2, link3, link4, link5])

        # Append 4 Immutable Investigator Notes for Master Case
        n1 = InvestigationNote(
            id=str(uuid.uuid4()),
            case_id=inv_b1001.id,
            author_id="usr_reg_01",
            author_name="Officer Vikram Malhotra",
            author_role="REGULATOR",
            note="Case opened following automated alert #CRIT-002 (Dead Batch Re-entry Collision). Cross-checked with Sovereign Dead Batch Registry; batch B1001 confirmed completely destroyed on 2026-06-21.",
            created_at=datetime.now(timezone.utc) - timedelta(days=2, hours=4)
        )
        n2 = InvestigationNote(
            id=str(uuid.uuid4()),
            case_id=inv_b1001.id,
            author_id="usr_admin_01",
            author_name="System Auditor",
            author_role="ADMIN",
            note="Reviewed SHA-256 certificate DC-1001 integrity fingerprint. Database hash matches physical burn witness record exactly. Physical leakage from disposal facility ruled out.",
            created_at=datetime.now(timezone.utc) - timedelta(days=1, hours=18)
        )
        n3 = InvestigationNote(
            id=str(uuid.uuid4()),
            case_id=inv_b1001.id,
            author_id="usr_reg_01",
            author_name="Officer Vikram Malhotra",
            author_role="REGULATOR",
            note="Issued legal takedown notice to hosting provider for Telegram Rx channel seller 'GlobalMeds24'. Evidence screenshot EV-2026-B1001-05 attached to legal file.",
            created_at=datetime.now(timezone.utc) - timedelta(days=1, hours=2)
        )
        n4 = InvestigationNote(
            id=str(uuid.uuid4()),
            case_id=inv_b1001.id,
            author_id="usr_pharm_01",
            author_name="Dr. Sunita Rao",
            author_role="PHARMACY",
            note="Confirmed zero inventory on shelf at MedPlus Central #104. Point-of-Sale hard sale blocking active and verified.",
            created_at=datetime.now(timezone.utc) - timedelta(hours=6)
        )
        db.add_all([n1, n2, n3, n4])


        audit1 = AuditLog(
            id="aud_init_001",
            action="SYSTEM_INITIALIZED",
            entity_type="SYSTEM",
            entity_id="SYS_PHARMASAFE_01",
            details="PharmaSafe Intelligence platform initialized with baseline cryptographic registries. B1001 (Paracetamol 500mg) seeded as demo lifecycle batch."
        )
        db.add(audit1)
        db.commit()


        print("[SUCCESS] Database successfully seeded with full PharmaSafe Intelligence scenario!")
        print(f"  B1001 (Paracetamol 500mg) -> AT_PHARMACY @ MedPlus | Qty: 18500 | Expiry: {today + timedelta(days=720)}")
        print(f"  AMX-2024-DEAD-01 -> DEAD BATCH in Registry | Cert: {dest_cert_hash[:24]}...")
        print(f"  4 Alerts seeded (2 CRITICAL)")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error during database seeding: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
