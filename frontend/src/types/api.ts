export type RoleType = 
  | 'ADMIN' 
  | 'MANUFACTURER' 
  | 'DISTRIBUTOR' 
  | 'PHARMACY' 
  | 'DISPOSAL_FACILITY' 
  | 'REGULATOR_AUDITOR';

export type BatchStatus = 
  | 'MANUFACTURED'
  | 'IN_DISTRIBUTION'
  | 'AT_PHARMACY'
  | 'DISPENSED'
  | 'EXPIRED'
  | 'RECALLED'
  | 'FLAGGED_SUSPICIOUS'
  | 'RETURN_INITIATED'
  | 'RETURN_IN_TRANSIT'
  | 'RECEIVED_AT_DISPOSAL'
  | 'DISPOSED'
  | 'DESTROYED'
  | 'DEAD_BATCH';

export type UnitType = 'TABLET_STRIP' | 'BOTTLE' | 'VIAL' | 'BOX' | 'AMPOULE';

export type ReturnReason = 
  | 'EXPIRED' 
  | 'RECALLED' 
  | 'SUSPECT_COUNTERFEIT' 
  | 'DAMAGED_IN_TRANSIT' 
  | 'STORAGE_BREACH'
  | 'CUSTOMER_RETURN';

export type ReturnStatus = 
  | 'RETURN_REQUESTED'
  | 'INITIATED'
  | 'PICKUP_SCHEDULED'
  | 'PICKED_UP'
  | 'PICKUP_COMPLETED'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'RECEIVED_AT_FACILITY'
  | 'UNDER_VERIFICATION'
  | 'VERIFIED'
  | 'RECONCILED'
  | 'AWAITING_DISPOSAL'
  | 'ROUTED_TO_DISPOSAL' 
  | 'DISPOSAL_ACCEPTED'
  | 'DISPOSAL_IN_PROGRESS'
  | 'RECEIVED_AT_DISPOSAL' 
  | 'DISPOSED'
  | 'CANCELLED';

export type VerificationStatus = 
  | 'AUTHENTIC'
  | 'EXPIRED'
  | 'RECALLED'
  | 'FLAGGED_SUSPICIOUS'
  | 'DEAD_BATCH_REENTRY_DETECTED'
  | 'UNKNOWN_NOT_FOUND';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: RoleType;
  organization_id?: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface Medicine {
  id: string;
  brand_name: string;
  generic_name: string;
  composition?: string;
  dosage_form: string;
  strength: string;
  storage_temp_min?: string;
  storage_temp_max?: string;
  storage_temp_celsius?: string;
  manufacturer_id: string;
  created_at: string;
}

export interface Batch {
  id: string;
  batch_number: string;
  gtin_barcode: string;
  medicine_id: string;
  manufacturer_id: string;
  mfg_date: string;
  expiry_date: string;
  initial_quantity: number;
  current_quantity: number;
  unit: UnitType;
  status: BatchStatus;
  current_custodian_id?: string;
  is_recalled: boolean;
  recall_reason?: string;
  medicine?: Medicine;
  created_at: string;
  updated_at: string;
}

export interface CustodyTransfer {
  id: string;
  batch_id: string;
  stage: string;
  from_organization_id: string;
  to_organization_id: string;
  transferred_quantity: number;
  verified_quantity?: number;
  has_discrepancy: boolean;
  discrepancy_notes?: string;
  location_name?: string;
  timestamp: string;
}

export interface BatchPassport {
  batch_id: string;
  batch_number: string;
  gtin_barcode: string;
  status: BatchStatus;
  medicine: Medicine;
  manufacturer_name: string;
  mfg_date: string;
  expiry_date: string;
  initial_quantity: number;
  current_quantity: number;
  unit: UnitType;
  current_custodian_name?: string;
  is_recalled: boolean;
  recall_reason?: string;
  is_dead_batch: boolean;
  destruction_cert_hash?: string;
  custody_history: CustodyTransfer[];
  latest_risk_score?: number;
  risk_level?: RiskLevel;
  created_at: string;
}

export interface VerificationScanResult {
  verification_status: VerificationStatus;
  batch_number?: string;
  brand_name?: string;
  generic_name?: string;
  manufacturer_name?: string;
  is_expired: boolean;
  is_recalled: boolean;
  is_dead_batch_reentry: boolean;
  warning_message?: string;
  timestamp: string;
  scan_id: string;
}

export interface ReturnRequest {
  id: string;
  batch_id: string;
  initiator_org_id: string;
  destination_facility_id: string;
  quantity: number;
  received_quantity?: number;
  scale_weight_kg?: string;
  carrier_name?: string;
  carrier_tracking_ref?: string;
  driver_badge?: string;
  reason: ReturnReason;
  status: ReturnStatus;
  tracking_code: string;
  manifest_hash?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DisposalRecord {
  id: string;
  return_id?: string;
  batch_id: string;
  facility_org_id: string;
  operator_user_id?: string;
  disposed_quantity: number;
  disposal_method: string;
  scale_weight_kg?: string;
  evidence_media_url?: string;
  status: string;
  notes?: string;
  timestamp: string;
}

export interface DestructionRecord {
  id: string;
  batch_id: string;
  return_id?: string;
  facility_org_id: string;
  quantity_destroyed: number;
  destruction_method: string;
  witness_name: string;
  witness_badge_id: string;
  certificate_sha256_hash: string;
  certificate_url?: string;
  evidence_media_url?: string;
  facility_notes?: string;
  timestamp: string;
}

export interface DeadBatch {
  id: string;
  batch_id: string;
  batch_number: string;
  gtin_barcode: string;
  destruction_record_id: string;
  destruction_cert_hash: string;
  manufacturer_name: string;
  quantity_destroyed: number;
  destroyed_at: string;
  blacklisted_at: string;
  reentry_attempts_count: number;
  last_reentry_detected_at?: string;
  is_actively_monitored: boolean;
}

export interface RiskScoreReport {
  batch_id: string;
  composite_risk_score: number;
  risk_level: RiskLevel;
  expiry_risk_score: number;
  supply_chain_anomaly_score: number;
  reentry_risk_score: number;
  seller_reputation_score: number;
  explanation_summary: string;
  factor_breakdown?: Record<string, any>;
  timestamp: string;
}

export interface AnomalyItem {
  id: string;
  batch_id: string;
  anomaly_type: string;
  severity: RiskLevel;
  description: string;
  raw_evidence?: Record<string, any>;
  timestamp: string;
}

export interface BatchRiskEvaluation {
  batch_id: string;
  batch_number?: string;
  composite_risk_score: number;
  risk_level: RiskLevel;
  expiry_risk_score: number;
  movement_anomaly_score: number;
  quantity_anomaly_score: number;
  reentry_risk_score: number;
  seller_listing_risk_score: number;
  explanation_summary: string;
  reasons: string[];
  contributing_features: Record<string, any>;
  anomalies_detected: Array<{
    anomaly_type: string;
    severity: RiskLevel;
    description: string;
    raw_evidence?: Record<string, any>;
  }>;
  model_version: string;
  deterministic_safety_preserved: boolean;
  timestamp: string;
}

export interface IntelligenceSummary {
  total_batches_monitored: number;
  high_risk_lots_count: number;
  anomalies_active_count: number;
  reentry_threats_count: number;
  average_system_risk_score: number;
  model_version: string;
  last_evaluated_at: string;
}

export interface BatchSimulationRequest {
  batch_number?: string;
  days_to_expiry?: number;
  transit_speed_kmh?: number;
  shrinkage_quantity?: number;
  illicit_marketplace_listing?: boolean;
  is_dead_batch_simulated?: boolean;
  marketplace_discount_percent?: number;
}

export interface OnlineSurveillanceItem {
  id: string;
  platform_name: string;
  listing_url?: string;
  seller_name: string;
  medicine_brand_claimed: string;
  extracted_batch_number?: string;
  listed_price_inr?: number;
  discount_percentage?: number;
  is_dead_batch_match: boolean;
  risk_score: number;
  risk_level: RiskLevel;
  flagged_reasons?: string;
  detected_at: string;
}

export interface ComplianceSummary {
  total_active_batches: number;
  total_expired_batches: number;
  total_recalled_batches: number;
  total_returns_in_transit: number;
  total_destroyed_dead_batches: number;
  total_reentry_violations_prevented: number;
  overall_system_integrity_score: number;
}

export interface BatchTimelineEvent {
  id?: string;
  stage: string;
  title: string;
  event_type?: string;
  timestamp: string;
  actor?: string;
  organization?: string;
  quantity?: number;
  location?: string;
  status: 'COMPLETED' | 'PENDING' | 'ALERT' | 'BLOCKED' | 'WARNING' | string;
  previous_status?: string;
  new_status?: string;
  details?: string;
}

export interface ManufacturerDashboardData {
  total_batches: number;
  active_batches: number;
  near_expiry_batches: number;
  expired_batches: number;
  recalled_batches: number;
  distributed_batches: number;
  returned_batches: number;
  destroyed_batches: number;
  total_units_manufactured: number;
  total_units_in_inventory: number;
  recent_batches: Batch[];
  recent_transfers: CustodyTransfer[];
  recent_returns: any[];
  critical_alerts: any[];
  status_distribution: Record<string, number>;
}

export interface InboundShipmentItem {
  id: string;
  batch_id: string;
  batch_number: string;
  gtin_barcode?: string;
  medicine_name: string;
  medicine_generic_name?: string;
  dosage_form?: string;
  sender_org: string;
  source_org_name?: string;
  from_organization_id?: string;
  to_organization_id?: string;
  expected_quantity: number;
  quantity?: number;
  received_quantity: number;
  discrepancy: number;
  has_discrepancy?: boolean;
  discrepancy_notes?: string;
  expiry_date: string;
  stage: string;
  is_confirmed: boolean;
  status: 'PENDING' | 'VERIFIED' | 'DISCREPANCY_FLAGGED';
  timestamp: string;
  dispatched_at?: string;
}

export interface DistributorDashboardData {
  total_received: number;
  total_inventory: number;
  pending_receiving: number;
  pending_transfers: number;
  discrepancies_count: number;
  near_expiry_batches: number;
  expired_batches: number;
  critical_alerts_count: number;
  incoming_shipments: InboundShipmentItem[];
  recent_transfers: any[];
  critical_alerts: any[];
}

export interface PharmacyDashboardData {
  active_stock: number;
  incoming_count: number;
  near_expiry_count: number;
  expired_count: number;
  recalled_count: number;
  blocked_count: number;
  return_ready_count: number;
  incoming_shipments: InboundShipmentItem[];
  recent_scans: any[];
  alerts: any[];
}

export interface InventoryRecord {
  id: string;
  organization_id: string;
  batch_id: string;
  batch_number?: string;
  gtin_barcode?: string;
  medicine_name?: string;
  medicine_brand_name?: string;
  medicine_generic_name?: string;
  dosage_form?: string;
  expiry_date?: string;
  batch_status?: string;
  is_expired?: boolean;
  is_recalled?: boolean;
  location?: string;
  quantity?: number;
  quantity_received: number;
  quantity_available: number;
  quantity_quarantined: number;
  updated_at: string;
}

export interface ValidationCheckDetail {
  name: string;
  passed: boolean;
  status: string;
  message: string;
}

export interface SaleVerificationResult {
  batch_id?: string;
  batch_number?: string;
  medicine_name?: string;
  dosage_form?: string;
  gtin_barcode?: string;
  expiry_date?: string;
  requested_quantity: number;
  available_quantity: number;
  is_eligible_for_sale: boolean;
  verdict: 'ALLOW_SALE' | 'BLOCK_SALE';
  block_reason?: string;
  block_message?: string;
  action_guidance: string;
  checks: ValidationCheckDetail[];
  timestamp: string;
}

export interface SaleTransactionRecord {
  id: string;
  batch_id: string;
  batch_number?: string;
  medicine_name?: string;
  seller_org_id: string;
  sold_by_user_id?: string;
  customer_reference?: string;
  quantity_sold: number;
  sale_allowed: boolean;
  block_reason?: string;
  block_message?: string;
  timestamp: string;
}

export type ListingVerificationDecision = 'ALLOW' | 'REVIEW' | 'BLOCK';

export type ListingStatus = 
  | 'ACTIVE' 
  | 'PERMITTED' 
  | 'PENDING_REVIEW' 
  | 'BLOCKED' 
  | 'TAKEN_DOWN' 
  | 'TAKEDOWN_REQUESTED'
  | 'FLAGGED';

export interface StageCheckResult {
  stage: string;
  status: 'PASSED' | 'WARNING' | 'FAILED';
  details: string;
  metadata?: Record<string, any>;
}

export interface ListingVerificationRequest {
  platform_name: string;
  listing_url?: string;
  seller_name: string;
  seller_org_id?: string;
  seller_license_number?: string;
  claimed_product_name: string;
  batch_number?: string;
  offered_quantity?: number;
  listed_price_inr?: number;
  claimed_qr_payload?: string;
  claimed_certificate_hash?: string;
}

export interface ListingVerificationResponse {
  decision: ListingVerificationDecision;
  risk_level: RiskLevel;
  risk_score: number;
  summary: string;
  decision_reasons: string[];
  stage_checks: Record<string, StageCheckResult>;
  batch_matched: boolean;
  seller_matched: boolean;
  product_matched: boolean;
  dead_batch_detected: boolean;
}

export interface OnlineMedicineListing {
  id: string;
  listing_reference: string;
  platform_name: string;
  listing_url?: string;
  seller_name: string;
  seller_org_id?: string;
  seller_license_number?: string;
  claimed_product_name: string;
  medicine_id?: string;
  batch_number?: string;
  batch_id?: string;
  offered_quantity?: number;
  listed_price_inr?: number;
  claimed_qr_payload?: string;
  claimed_certificate_hash?: string;
  verification_decision: ListingVerificationDecision;
  risk_level: RiskLevel;
  risk_score: number;
  decision_reasons: string[];
  stage_checks: Record<string, StageCheckResult>;
  listing_status: string;
  takedown_requested: boolean;
  takedown_requested_at?: string;
  enforcement_notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface OnlineSafetySummary {
  total_evaluated_listings: number;
  allowed_count: number;
  review_count: number;
  blocked_count: number;
  takedowns_issued: number;
  active_compliance_rate: number;
}

export interface PharmacyExpirySurveillanceItem {
  batch_id: string;
  batch_number: string;
  medicine_name: string;
  generic_name: string;
  pharmacy_id: string;
  pharmacy_name: string;
  pharmacy_license: string;
  pharmacy_location: string;
  stock_on_shelf: number;
  initial_quantity: number;
  mfg_date: string;
  expiry_date: string;
  days_to_expiry: number;
  shelf_life_percentage: number;
  expiry_status: 'EXPIRED_SELLING_HAZARD' | 'CRITICAL_NEAR_EXPIRY' | 'EXPIRY_MONITORED' | 'HEALTHY_SHELF_LIFE';
  ai_risk_score: number;
  selling_velocity_daily: number;
  projected_expired_stock_units: number;
  thermal_degradation_index: number;
  directive_action_needed: boolean;
  directive_status: 'DIRECTIVE_REQUIRED' | 'DIRECTIVE_DISPATCHED_RETURN_ACTIVE' | 'SAFE_NO_ACTION';
  recommended_action: string;
  existing_return_tracking?: string | null;
}

export interface PharmacyExpirySurveillanceResponse {
  status: string;
  timestamp: string;
  total_pharmacies_monitored: number;
  total_batches_scanned: number;
  expired_selling_threats_count: number;
  critical_near_expiry_count: number;
  active_recall_directives_count: number;
  surveillance_feed: PharmacyExpirySurveillanceItem[];
}

export interface DispatchRecallDirectivePayload {
  batch_id: string;
  pharmacy_id?: string;
  pharmacy_name?: string;
  reason?: string;
  auto_lock_pos?: boolean;
}

export interface CrossTierBatchTelemetry {
  batch_id: string;
  batch_number: string;
  medicine_name: string;
  mfg_date: string;
  expiry_date: string;
  days_to_expiry: number;
  is_expired: boolean;
  is_recalled: boolean;
  produced_qty: number;
  distributor_qty: number;
  pharmacy_shelf_qty: number;
  patient_dispensed_qty: number;
  gtin_code: string;
  qr_payload: string;
  current_tier_status: string;
}

export interface LiveSalesFeedItem {
  sale_id: string;
  batch_id: string;
  batch_number: string;
  medicine_name: string;
  quantity_sold: number;
  pharmacy_name: string;
  sale_allowed: boolean;
  block_reason?: string | null;
  customer_ref: string;
  timestamp: string;
}

export interface CrossTierStreamResponse {
  status: string;
  timestamp: string;
  manufacturer_tier: {
    total_batches_inscribed: number;
    total_units_manufactured: number;
    total_units_dispatched: number;
    live_dispensed_at_pharmacy: number;
    active_manufacturing_plants: number;
  };
  distributor_tier: {
    active_warehouses: number;
    inbound_scanned_units: number;
    warehouse_holding_units: number;
    outbound_dispatched_to_pharmacy: number;
  };
  pharmacy_tier: {
    active_pharmacies_monitored: number;
    pharmacy_shelf_holding_units: number;
    total_patient_dispensed_units: number;
    blocked_dispensing_attempts: number;
  };
  batches_telemetry: CrossTierBatchTelemetry[];
  live_sales_feed: LiveSalesFeedItem[];
}

// ── Phase 11: Advanced Evidence & Analytics ─────────────────────────────

export type EvidenceType =
  | 'PACKAGE_IMAGE'
  | 'MEDICINE_INSPECTION_PHOTO'
  | 'QR_CODE_SNAPSHOT'
  | 'MANUFACTURER_COA_PDF'
  | 'TRANSPORT_WAYBILL_SCAN'
  | 'DISPOSAL_SCALE_WEIGHT_RECEIPT'
  | 'DESTRUCTION_CERTIFICATE_MEDIA'
  | 'MARKETPLACE_LISTING_SCREENSHOT'
  | 'FORENSIC_LAB_REPORT'
  | 'GENERAL_ATTACHMENT';

export type EvidenceStatus =
  | 'UPLOADED'
  | 'PROCESSING'
  | 'VERIFIED'
  | 'QUARANTINED'
  | 'FLAGGED_MISMATCH'
  | 'FINALIZED';

export type OCRStatus =
  | 'PENDING'
  | 'PROCESSED'
  | 'MATCH'
  | 'MISMATCH'
  | 'REVIEW_REQUIRED'
  | 'FAILED'
  | 'NOT_APPLICABLE';

export type CasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type CaseStatus = 'OPEN' | 'IN_PROGRESS' | 'UNDER_REVIEW' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';

export interface EvidenceItem {
  id: string;
  evidence_id: string;
  batch_id?: string;
  entity_type: string;
  entity_id: string;
  evidence_type: EvidenceType;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  storage_reference: string;
  checksum: string;
  uploaded_by_id?: string;
  status: EvidenceStatus;
  ocr_status: OCRStatus;
  ocr_text_extracted?: string;
  extracted_fields?: Record<string, any>;
  comparison_result?: Record<string, any>;
  vision_screening_score?: number;
  is_finalized: boolean;
  notes?: string;
  created_at: string;
}

export interface PackageComparisonResult {
  evidence_id: string;
  batch_id: string;
  overall_verdict: 'MATCH' | 'MISMATCH' | 'REVIEW_REQUIRED';
  comparisons: Record<string, {
    status: 'MATCH' | 'MISMATCH' | 'MISSING_IN_CAPTURE' | 'NO_COMPARISON_BASELINE';
    captured_val: any;
    db_val: any;
  }>;
  extracted_fields: Record<string, any>;
  verified_at: string;
}

export interface InvestigationNote {
  id: string;
  note_id: string;
  author_name: string;
  author_role: string;
  content: string;
  is_evidence_flag: boolean;
  timestamp: string;
}

export interface InvestigationCaseSummary {
  id: string;
  case_id: string;
  batch_id?: string;
  title: string;
  description: string;
  priority: CasePriority;
  status: CaseStatus;
  assigned_to_name?: string;
  assigned_role?: string;
  risk_score: number;
  risk_level: RiskLevel;
  created_at: string;
  updated_at: string;
}

export interface InvestigationCaseDetail extends InvestigationCaseSummary {
  findings_summary?: string;
  resolution_notes?: string;
  timeline: Array<{
    phase: string;
    title: string;
    timestamp: string;
    actor: string;
    details: string;
    status: string;
  }>;
  custody_chain: Array<{
    stage: string;
    organization: string;
    location: string;
    quantity: number;
    status: string;
    evidence_count: number;
  }>;
  evidence_items: Array<{
    evidence_id: string;
    title: string;
    type: string;
    checksum: string;
    storage_reference: string;
    ocr_status: string;
    is_finalized: boolean;
    relevance_notes?: string;
    created_at: string;
  }>;
  notes: InvestigationNote[];
  ai_risk_eval?: Record<string, any>;
  alerts?: Array<Record<string, any>>;
  marketplace_listings?: Array<Record<string, any>>;
}

export interface AnalyticsOverview {
  total_batches: number;
  active_batches: number;
  quarantined_batches: number;
  active_returns: number;
  dead_registry_count: number;
  blocked_sales: number;
  online_takedowns: number;
  open_investigations: number;
  evidence_items_count: number;
  fleet_risk_index: number;
  system_compliance_score: number;
  timestamp: string;
}

export interface ForwardSupplyAnalytics {
  total_transfers: number;
  confirmed_transfers: number;
  pending_transfers: number;
  transferred_units: number;
  stage_distribution: Array<{ stage: string; count: number }>;
  organization_activity: Array<{ org: string; count: number }>;
}

export interface ReverseLogisticsAnalytics {
  total_returns: number;
  discrepancy_returns: number;
  discrepancy_rate: number;
  reason_distribution: Array<{ reason: string; count: number }>;
  status_pipeline: Array<{ status: string; count: number }>;
}

export interface DisposalThroughputAnalytics {
  total_disposals: number;
  disposed_units: number;
  total_scale_weight_kg: number;
  method_distribution: Array<{ method: string; count: number }>;
  facility_throughput: Array<{ facility: string; count: number; units: number }>;
}

export interface DestructionAnalytics {
  total_certificates: number;
  verified_certificates: number;
  total_destroyed_units: number;
  status_distribution: Array<{ status: string; count: number }>;
  monthly_destruction_trend: Array<{ month: string; units: number; certificates: number }>;
}

export interface OnlineMarketplaceAnalytics {
  total_screened_listings: number;
  takedowns_issued: number;
  blocked_listings: number;
  platform_distribution: Array<{ platform: string; count: number }>;
  decision_distribution: Array<{ decision: string; count: number }>;
}

export interface AIRiskAnalytics {
  total_risk_evaluations: number;
  critical_risk_batches: number;
  high_risk_batches: number;
  risk_level_distribution: Array<{ level: string; count: number }>;
  top_anomaly_indicators: Array<{ anomaly: string; count: number }>;
}

export interface ComplianceAnalytics {
  compliance_index: number;
  dimensions: Array<{ dimension: string; score: number; target: number }>;
}

export interface GeospatialTelemetryPoint {
  entity_id: string;
  entity_type: string;
  location_name: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  status: string;
}

export interface BatchInvestigationReport {
  report_metadata: {
    report_reference: string;
    generated_at: string;
    generated_by: string;
    batch_number: string;
    compliance_classification: string;
    disclaimer: string;
  };
  batch_passport: Record<string, any>;
  timeline: Array<{
    timestamp: string;
    phase: string;
    event: string;
    details: string;
  }>;
  evidentiary_index: Array<{
    evidence_id: string;
    type: string;
    file_name: string;
    sha256_checksum: string;
    ocr_verdict: string;
    is_finalized: boolean;
  }>;
  ai_risk_intelligence: Record<string, any>;
  compliance_audit: {
    statutory_verdict: string;
    verified_dead_batch: boolean;
    sale_blocking_status: string;
    reverse_reconciliation: string;
    total_evidentiary_hashes_linked: number;
  };
}
