import { 
  User, Batch, BatchPassport, ReturnRequest, DestructionRecord, 
  DeadBatch, RiskScoreReport, OnlineSurveillanceItem, ComplianceSummary 
} from '../types/api';

// 6 Core Personas
export const MOCK_USERS: Record<string, User> = {
  manufacturer: {
    id: 'usr_mfg_01',
    email: 'manufacturer@pharmasafe.demo',
    full_name: 'Dr. Rajesh Sharma',
    role: 'MANUFACTURER',
    organization_id: 'org_pfizer_india',
    is_active: true,
    created_at: '2024-01-10T08:00:00Z',
  },
  distributor: {
    id: 'usr_dist_01',
    email: 'distributor@pharmasafe.demo',
    full_name: 'Vikram Sethi',
    role: 'DISTRIBUTOR',
    organization_id: 'org_apollo_logistics',
    is_active: true,
    created_at: '2024-01-15T08:00:00Z',
  },
  pharmacy: {
    id: 'usr_pharm_01',
    email: 'pharmacy@pharmasafe.demo',
    full_name: 'Ananya Iyer, R.Ph.',
    role: 'PHARMACY',
    organization_id: 'org_medplus_retail',
    is_active: true,
    created_at: '2024-01-20T08:00:00Z',
  },
  disposal: {
    id: 'usr_disp_01',
    email: 'disposal@pharmasafe.demo',
    full_name: 'Captain David Thomas',
    role: 'DISPOSAL_FACILITY',
    organization_id: 'org_green_shield_disposal',
    is_active: true,
    created_at: '2024-02-01T08:00:00Z',
  },
  regulator: {
    id: 'usr_reg_01',
    email: 'regulator@pharmasafe.demo',
    full_name: 'Inspector S. K. Roy',
    role: 'REGULATOR_AUDITOR',
    organization_id: 'org_cdsco_regulator',
    is_active: true,
    created_at: '2024-01-01T08:00:00Z',
  },
  admin: {
    id: 'usr_admin_01',
    email: 'admin@pharmasafe.demo',
    full_name: 'PharmaSafe System Ops',
    role: 'ADMIN',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
};

export const MOCK_ORGANIZATIONS = [
  { id: 'org_pfizer_india', name: 'Pfizer Healthcare India Ltd.', role: 'MANUFACTURER', license: 'LIC-MFG-MH-2024-9981', city: 'Mumbai' },
  { id: 'org_apollo_logistics', name: 'Apollo National Distribution Hub', role: 'DISTRIBUTOR', license: 'LIC-DST-DL-2023-8812', city: 'New Delhi' },
  { id: 'org_medplus_retail', name: 'MedPlus Central Pharmacy #104', role: 'PHARMACY', license: 'LIC-RET-KA-2022-7719', city: 'Bengaluru' },
  { id: 'org_green_shield_disposal', name: 'GreenShield Bio-Hazard Incinerator', role: 'DISPOSAL_FACILITY', license: 'LIC-ENV-DISP-TS-0091', city: 'Hyderabad' },
  { id: 'org_cdsco_regulator', name: 'CDSCO Central Drug Authority', role: 'REGULATOR_AUDITOR', license: 'GOV-REG-CDSCO-001', city: 'New Delhi' },
];

// Reactive demo state for Batch B1001 to enable the 22-step hackathon judge story
export interface DemoState {
  currentStep: number;
  b1001Status: 'MANUFACTURED' | 'IN_DISTRIBUTION' | 'AT_PHARMACY' | 'EXPIRED' | 'RETURN_INITIATED' | 'RETURN_IN_TRANSIT' | 'RECEIVED_AT_DISPOSAL' | 'DISPOSED' | 'DESTROYED' | 'DEAD_BATCH';
  b1001Expiry: string;
  isB1001Returned: boolean;
  isB1001Destroyed: boolean;
  isB1001InDeadRegistry: boolean;
  reentryDetected: boolean;
  destructionCertHash: string | null;
}

export const demoState: DemoState = {
  currentStep: 1,
  b1001Status: 'AT_PHARMACY',
  b1001Expiry: '2026-09-30',
  isB1001Returned: false,
  isB1001Destroyed: false,
  isB1001InDeadRegistry: false,
  reentryDetected: false,
  destructionCertHash: null,
};

// Batches Registry
export const MOCK_BATCHES: Batch[] = [
  {
    id: 'btc_b1001',
    batch_number: 'B1001',
    gtin_barcode: '8901088019912',
    medicine_id: 'med_paracet_500',
    manufacturer_id: 'org_pfizer_india',
    mfg_date: '2024-03-15',
    expiry_date: '2026-09-30',
    initial_quantity: 1000,
    current_quantity: 1000,
    unit: 'BOX',
    status: 'AT_PHARMACY',
    current_custodian_id: 'org_medplus_retail',
    is_recalled: false,
    created_at: '2024-03-15T10:00:00Z',
    updated_at: '2024-03-25T14:30:00Z',
  },
  {
    id: 'btc_b1002',
    batch_number: 'B1002',
    gtin_barcode: '8901088019929',
    medicine_id: 'med_amox_500',
    manufacturer_id: 'org_pfizer_india',
    mfg_date: '2024-04-01',
    expiry_date: '2027-04-01',
    initial_quantity: 5000,
    current_quantity: 4850,
    unit: 'BOX',
    status: 'IN_DISTRIBUTION',
    current_custodian_id: 'org_apollo_logistics',
    is_recalled: false,
    created_at: '2024-04-01T09:00:00Z',
    updated_at: '2024-04-05T11:20:00Z',
  },
  {
    id: 'btc_b1003',
    batch_number: 'B1003',
    gtin_barcode: '8901088019936',
    medicine_id: 'med_azith_250',
    manufacturer_id: 'org_pfizer_india',
    mfg_date: '2023-01-10',
    expiry_date: '2024-01-10',
    initial_quantity: 2500,
    current_quantity: 320,
    unit: 'TABLET_STRIP',
    status: 'EXPIRED',
    current_custodian_id: 'org_medplus_retail',
    is_recalled: false,
    created_at: '2023-01-10T08:00:00Z',
    updated_at: '2024-01-11T00:00:00Z',
  },
  {
    id: 'btc_b1004',
    batch_number: 'B1004',
    gtin_barcode: '8901088019943',
    medicine_id: 'med_remdes_100',
    manufacturer_id: 'org_pfizer_india',
    mfg_date: '2024-02-20',
    expiry_date: '2025-08-20',
    initial_quantity: 1200,
    current_quantity: 1100,
    unit: 'VIAL',
    status: 'RECALLED',
    current_custodian_id: 'org_apollo_logistics',
    is_recalled: true,
    recall_reason: 'Microbial compromise detected in lot #4 rubber seal',
    created_at: '2024-02-20T10:00:00Z',
    updated_at: '2024-05-12T16:00:00Z',
  },
  {
    id: 'btc_b1005',
    batch_number: 'B1005',
    gtin_barcode: '8901088019950',
    medicine_id: 'med_dolo_650',
    manufacturer_id: 'org_pfizer_india',
    mfg_date: '2023-08-01',
    expiry_date: '2024-08-01',
    initial_quantity: 1000,
    current_quantity: 980,
    unit: 'BOX',
    status: 'RETURN_IN_TRANSIT',
    current_custodian_id: 'org_apollo_logistics',
    is_recalled: false,
    created_at: '2023-08-01T08:00:00Z',
    updated_at: '2024-08-15T09:30:00Z',
  },
  {
    id: 'btc_b9001',
    batch_number: 'B9001',
    gtin_barcode: '8901088019998',
    medicine_id: 'med_cipro_500',
    manufacturer_id: 'org_pfizer_india',
    mfg_date: '2022-05-10',
    expiry_date: '2023-11-10',
    initial_quantity: 3000,
    current_quantity: 0,
    unit: 'BOX',
    status: 'DEAD_BATCH',
    current_custodian_id: 'org_green_shield_disposal',
    is_recalled: false,
    created_at: '2022-05-10T08:00:00Z',
    updated_at: '2023-12-01T15:00:00Z',
  }
];

// Digital Batch Passport for B1001
export const getMockBatchPassport = (batchNumber: string): BatchPassport => {
  if (batchNumber === 'B1001') {
    return {
      batch_id: 'btc_b1001',
      batch_number: 'B1001',
      gtin_barcode: '8901088019912',
      status: demoState.b1001Status,
      medicine: {
        id: 'med_paracet_500',
        brand_name: 'Paracetamol 500mg IP',
        generic_name: 'Acetaminophen / Paracetamol',
        composition: 'Paracetamol 500mg, Excipients q.s.',
        dosage_form: 'Tablet',
        strength: '500mg',
        storage_temp_min: '15°C',
        storage_temp_max: '25°C',
        manufacturer_id: 'org_pfizer_india',
        created_at: '2024-03-15T10:00:00Z',
      },
      manufacturer_name: 'Pfizer Healthcare India Ltd.',
      mfg_date: '2024-03-15',
      expiry_date: demoState.b1001Expiry,
      initial_quantity: 1000,
      current_quantity: demoState.isB1001Destroyed ? 0 : 1000,
      unit: 'BOX',
      current_custodian_name: demoState.isB1001Destroyed 
        ? 'GreenShield Bio-Hazard Incinerator' 
        : (demoState.isB1001Returned ? 'Apollo National Distribution Hub' : 'MedPlus Central Pharmacy #104'),
      is_recalled: false,
      is_dead_batch: demoState.isB1001InDeadRegistry,
      destruction_cert_hash: demoState.destructionCertHash || (demoState.isB1001Destroyed ? 'd4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35' : undefined),
      custody_history: [
        {
          id: 'cst_01',
          batch_id: 'btc_b1001',
          stage: 'MANUFACTURED',
          from_organization_id: 'org_pfizer_india',
          to_organization_id: 'org_pfizer_india',
          transferred_quantity: 1000,
          verified_quantity: 1000,
          has_discrepancy: false,
          location_name: 'Pfizer Plant #2, Kurla, Mumbai',
          timestamp: '2024-03-15T10:30:00Z',
        },
        {
          id: 'cst_02',
          batch_id: 'btc_b1001',
          stage: 'DISTRIBUTION_TRANSIT',
          from_organization_id: 'org_pfizer_india',
          to_organization_id: 'org_apollo_logistics',
          transferred_quantity: 1000,
          verified_quantity: 1000,
          has_discrepancy: false,
          location_name: 'Apollo Northern Depot, New Delhi',
          timestamp: '2024-03-18T14:15:00Z',
        },
        {
          id: 'cst_03',
          batch_id: 'btc_b1001',
          stage: 'DELIVERED_TO_PHARMACY',
          from_organization_id: 'org_apollo_logistics',
          to_organization_id: 'org_medplus_retail',
          transferred_quantity: 1000,
          verified_quantity: 1000,
          has_discrepancy: false,
          location_name: 'MedPlus Store #104, Indiranagar, Bengaluru',
          timestamp: '2024-03-22T11:45:00Z',
        },
      ],
      latest_risk_score: demoState.reentryDetected ? 0.98 : (demoState.b1001Status === 'EXPIRED' ? 0.85 : 0.04),
      risk_level: demoState.reentryDetected ? 'CRITICAL' : (demoState.b1001Status === 'EXPIRED' ? 'HIGH' : 'LOW'),
      created_at: '2024-03-15T10:00:00Z',
    };
  }

  // Fallback for other batches
  return {
    batch_id: 'btc_' + batchNumber.toLowerCase(),
    batch_number: batchNumber,
    gtin_barcode: '8901088019999',
    status: 'ACTIVE' as any,
    medicine: {
      id: 'med_gen_01',
      brand_name: 'Standard Medicine',
      generic_name: 'Generic Compound',
      dosage_form: 'Tablet',
      strength: '500mg',
      storage_temp_min: '15°C',
      storage_temp_max: '25°C',
      manufacturer_id: 'org_pfizer_india',
      created_at: '2024-01-01T00:00:00Z',
    },
    manufacturer_name: 'Pfizer Healthcare India Ltd.',
    mfg_date: '2024-01-01',
    expiry_date: '2026-12-31',
    initial_quantity: 1000,
    current_quantity: 1000,
    unit: 'BOX',
    current_custodian_name: 'Apollo National Distribution Hub',
    is_recalled: false,
    is_dead_batch: false,
    custody_history: [],
    latest_risk_score: 0.12,
    risk_level: 'LOW',
    created_at: '2024-01-01T00:00:00Z',
  };
};

// Reverse Logistics Returns
export const MOCK_RETURNS: ReturnRequest[] = [
  {
    id: 'ret_001',
    batch_id: 'btc_b1005',
    initiator_org_id: 'org_medplus_retail',
    destination_facility_id: 'org_green_shield_disposal',
    quantity: 1000,
    reason: 'EXPIRED',
    status: 'IN_TRANSIT',
    tracking_code: 'TRK-REV-2024-0891',
    manifest_hash: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    notes: 'Pharmacy reported 20 missing strips during courier pickup handoff. Expected: 1000, Received: 980.',
    created_at: '2024-08-12T10:00:00Z',
    updated_at: '2024-08-14T16:20:00Z',
  },
  {
    id: 'ret_002',
    batch_id: 'btc_b1004',
    initiator_org_id: 'org_apollo_logistics',
    destination_facility_id: 'org_green_shield_disposal',
    quantity: 1100,
    reason: 'RECALLED',
    status: 'RECEIVED_AT_DISPOSAL',
    tracking_code: 'TRK-REV-2024-0714',
    manifest_hash: 'sha256:8b45a1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d8888',
    notes: 'Full manufacturer quarantine recall of contaminated lots.',
    created_at: '2024-05-15T08:30:00Z',
    updated_at: '2024-05-18T14:10:00Z',
  }
];

// Destruction Certificates
export const MOCK_CERTIFICATES: DestructionRecord[] = [
  {
    id: 'cert_dst_9001',
    batch_id: 'btc_b9001',
    return_id: 'ret_archive_881',
    facility_org_id: 'org_green_shield_disposal',
    quantity_destroyed: 3000,
    destruction_method: 'HIGH_TEMP_INCINERATION_1200C',
    witness_name: 'Inspector Rajiv Verma (State FDA)',
    witness_badge_id: 'INSP-MH-9942',
    certificate_sha256_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    certificate_url: '/certificates/cert_dst_9001.pdf',
    evidence_media_url: '/storage/evidence/destruction_b9001.jpg',
    facility_notes: 'Denatured and incinerated in primary chamber per biohazard SOP. Dual witness signoff completed.',
    timestamp: '2023-12-01T15:00:00Z',
  }
];

// Dead Batch Registry
export const MOCK_DEAD_BATCHES: DeadBatch[] = [
  {
    id: 'ded_9001',
    batch_id: 'btc_b9001',
    batch_number: 'B9001',
    gtin_barcode: '8901088019998',
    destruction_record_id: 'cert_dst_9001',
    destruction_cert_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    manufacturer_name: 'Pfizer Healthcare India Ltd.',
    quantity_destroyed: 3000,
    destroyed_at: '2023-12-01T15:00:00Z',
    blacklisted_at: '2023-12-01T15:05:00Z',
    reentry_attempts_count: 3,
    last_reentry_detected_at: '2024-06-18T11:22:00Z',
    is_actively_monitored: true,
  }
];

// Online Marketplace Surveillance
export const MOCK_SURVEILLANCE: OnlineSurveillanceItem[] = [
  {
    id: 'lst_001',
    platform_name: 'Telegram: PharmaDirect Global Deals',
    listing_url: 'https://t.me/pharmadirect_deals/9044',
    seller_name: 'FastMeds_Wholesale',
    medicine_brand_claimed: 'Paracetamol 500mg IP (Pfizer)',
    extracted_batch_number: 'B1001',
    listed_price_inr: 120.0,
    discount_percentage: 75.0,
    is_dead_batch_match: true,
    risk_score: 0.98,
    risk_level: 'CRITICAL',
    flagged_reasons: 'CRITICAL ALERT: E-commerce listing features Batch B1001, which is permanently logged in the Dead Batch Registry. Deep 75% unverified discount.',
    detected_at: '2024-09-10T14:15:00Z',
  },
  {
    id: 'lst_002',
    platform_name: 'IndiaB2B-Supplies Marketplace',
    listing_url: 'https://indiab2b-example.com/item/4412',
    seller_name: 'Apex Wholesale Drug Corp',
    medicine_brand_claimed: 'Ciprofloxacin 500mg',
    extracted_batch_number: 'B9001',
    listed_price_inr: 210.0,
    discount_percentage: 60.0,
    is_dead_batch_match: true,
    risk_score: 0.95,
    risk_level: 'CRITICAL',
    flagged_reasons: 'CRITICAL: Batch B9001 incinerated at GreenShield facility on 01/12/2023. Possible counterfeit or diverted packaging reuse.',
    detected_at: '2024-09-08T09:30:00Z',
  },
  {
    id: 'lst_003',
    platform_name: 'MedZone Online Clearance',
    listing_url: 'https://medzone-clearance.demo/p/990',
    seller_name: 'HealthBridge Retailers',
    medicine_brand_claimed: 'Amoxil 500mg',
    extracted_batch_number: 'B1002',
    listed_price_inr: 450.0,
    discount_percentage: 15.0,
    is_dead_batch_match: false,
    risk_score: 0.18,
    risk_level: 'LOW',
    flagged_reasons: 'Authorized seller, price conforms to standard wholesale margin.',
    detected_at: '2024-09-09T18:00:00Z',
  }
];

// Centralized Alerts Feed
export interface SystemAlert {
  id: string;
  type: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  description: string;
  batchNumber?: string;
  entityName?: string;
  timestamp: string;
  isAcknowledged: boolean;
  actionRequired?: string;
}

export const MOCK_ALERTS: SystemAlert[] = [
  {
    id: 'alt_001',
    type: 'CRITICAL',
    title: '🚨 DEAD BATCH MARKET RE-ENTRY DETECTED',
    description: 'Destroyed batch B1001 detected in unauthorized online channel (Telegram: PharmaDirect). Stock marked destroyed on certificate.',
    batchNumber: 'B1001',
    entityName: 'FastMeds_Wholesale',
    timestamp: '10 minutes ago',
    isAcknowledged: false,
    actionRequired: 'Issue immediate CDSCO freeze order and alert state regulatory inspectors.',
  },
  {
    id: 'alt_002',
    type: 'HIGH',
    title: '⚠️ REVERSE CUSTODY QUANTITY DISCREPANCY',
    description: 'Discrepancy of -20 boxes flagged during Distributor intake for Batch B1005 return. Expected: 1000, Verified: 980.',
    batchNumber: 'B1005',
    entityName: 'Apollo National Distribution Hub',
    timestamp: '2 hours ago',
    isAcknowledged: false,
    actionRequired: 'Audit courier driver manifest and quarantine received pallet.',
  },
  {
    id: 'alt_003',
    type: 'MEDIUM',
    title: 'BATCH APPROACHING MANDATORY QUARANTINE',
    description: 'Batch B1003 has passed stated expiry. Auto-sale lock engaged across registered point-of-sale systems.',
    batchNumber: 'B1003',
    entityName: 'MedPlus Central Pharmacy #104',
    timestamp: '1 day ago',
    isAcknowledged: true,
    actionRequired: 'Initiate reverse return request to authorized destruction facility.',
  },
  {
    id: 'alt_004',
    type: 'INFO',
    title: 'DESTRUCTION CERTIFICATE ISSUED',
    description: 'GreenShield certified thermal destruction of 3,000 units for Batch B9001. Cryptographic hash recorded in Dead Registry.',
    batchNumber: 'B9001',
    entityName: 'GreenShield Bio-Hazard Incinerator',
    timestamp: '3 days ago',
    isAcknowledged: true,
  }
];

// Audit Trail Events
export interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  organization: string;
  action: string;
  entity: string;
  entityId: string;
  result: 'SUCCESS' | 'WARNING' | 'CRITICAL_BLOCK';
  details: string;
}

export const MOCK_AUDIT_TRAIL: AuditEvent[] = [
  {
    id: 'aud_101',
    timestamp: '2024-09-10 14:15:22',
    user: 'Automated AI Sentinel',
    role: 'AI_INTELLIGENCE',
    organization: 'PharmaSafe Core',
    action: 'REENTRY_SURVEILLANCE_FLAG',
    entity: 'BATCH',
    entityId: 'B1001',
    result: 'CRITICAL_BLOCK',
    details: 'Matched listing on Telegram PharmaDirect against Dead Batch Registry. Risk score: 98%.',
  },
  {
    id: 'aud_102',
    timestamp: '2024-09-10 11:32:05',
    user: 'Ananya Iyer, R.Ph.',
    role: 'PHARMACY',
    organization: 'MedPlus Central Pharmacy #104',
    action: 'SALE_VERIFICATION_CHECKOUT',
    entity: 'BATCH',
    entityId: 'B1001',
    result: 'SUCCESS',
    details: 'Point of sale scan passed. Batch is authentic and within safe shelf life.',
  },
  {
    id: 'aud_103',
    timestamp: '2024-09-09 16:44:19',
    user: 'Vikram Sethi',
    role: 'DISTRIBUTOR',
    organization: 'Apollo National Distribution Hub',
    action: 'REVERSE_CUSTODY_HANDSHAKE',
    entity: 'RETURN',
    entityId: 'TRK-REV-2024-0891',
    result: 'WARNING',
    details: 'Discrepancy logged: 20 units missing from shipment B1005.',
  },
  {
    id: 'aud_104',
    timestamp: '2024-09-08 10:12:00',
    user: 'Captain David Thomas',
    role: 'DISPOSAL_FACILITY',
    organization: 'GreenShield Bio-Hazard Incinerator',
    action: 'CERTIFY_DESTRUCTION',
    entity: 'CERTIFICATE',
    entityId: 'cert_dst_9001',
    result: 'SUCCESS',
    details: 'Inscribed Batch B9001 in Dead Batch Registry with SHA-256 hash.',
  },
  {
    id: 'aud_105',
    timestamp: '2024-09-07 09:00:15',
    user: 'Dr. Rajesh Sharma',
    role: 'MANUFACTURER',
    organization: 'Pfizer Healthcare India Ltd.',
    action: 'BATCH_REGISTRATION',
    entity: 'BATCH',
    entityId: 'B1001',
    result: 'SUCCESS',
    details: 'Batch B1001 created with 1,000 units. Issued digital Batch Passport.',
  }
];

// Compliance Summary
export const MOCK_COMPLIANCE_SUMMARY: ComplianceSummary = {
  total_active_batches: 12480,
  total_expired_batches: 342,
  total_recalled_batches: 28,
  total_returns_in_transit: 184,
  total_destroyed_dead_batches: 890,
  total_reentry_violations_prevented: 14,
  overall_system_integrity_score: 98.4,
};
