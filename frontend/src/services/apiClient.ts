import { 
  AuthResponse, Batch, BatchPassport, VerificationScanResult, 
  ReturnRequest, DestructionRecord, DeadBatch, RiskScoreReport, 
  OnlineSurveillanceItem, ComplianceSummary, BatchTimelineEvent,
  ManufacturerDashboardData, DistributorDashboardData, PharmacyDashboardData,
  InboundShipmentItem, InventoryRecord, SaleVerificationResult, SaleTransactionRecord,
  ListingVerificationRequest, ListingVerificationResponse, OnlineMedicineListing, OnlineSafetySummary,
  PharmacyExpirySurveillanceResponse, DispatchRecallDirectivePayload, DispatchRecallDirectiveResponse,
  CrossTierStreamResponse,
  BatchRiskEvaluation, IntelligenceSummary, BatchSimulationRequest, AnomalyItem,
  EvidenceItem, PackageComparisonResult, InvestigationCaseSummary, InvestigationCaseDetail,
  InvestigationNote, AnalyticsOverview, ForwardSupplyAnalytics, ReverseLogisticsAnalytics,
  DisposalThroughputAnalytics, DestructionAnalytics, OnlineMarketplaceAnalytics, AIRiskAnalytics,
  ComplianceAnalytics, GeospatialTelemetryPoint, BatchInvestigationReport
} from '../types/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export interface DashboardSummaryData {
  active_batches: number;
  near_expiry_batches: number;
  expired_batches: number;
  recalled_batches: number;
  in_transit_returns: number;
  awaiting_disposal: number;
  destroyed_batches: number;
  dead_batches_in_registry: number;
  reentry_violations_prevented: number;
  critical_alerts_unread: number;
  compliance_rate: number;
}

export interface SystemAlertItem {
  id: string;
  alert_type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  is_read: boolean;
  is_resolved: boolean;
  created_at: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  actor_user_id?: string;
  actor_role?: string;
  details?: string;
  timestamp: string;
}

export interface InventoryItem {
  id: string;
  organization_id: string;
  batch_id: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  location?: string;
  updated_at: string;
}

export interface SaleAuthorizationResult {
  allowed: boolean;
  sale_id?: string;
  batch_number: string;
  reason?: string;
  units_sold?: number;
  timestamp: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('pharmasafe_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('pharmasafe_token', token);
    } else {
      localStorage.removeItem('pharmasafe_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  async ensureToken(): Promise<string | null> {
    if (this.token) return this.token;
    this.token = localStorage.getItem('pharmasafe_token');
    if (this.token) return this.token;

    // Auto-login as active persona or manufacturer
    try {
      const savedUserStr = localStorage.getItem('pharmasafe_user');
      let roleKey = 'manufacturer';
      if (savedUserStr) {
        try {
          const u = JSON.parse(savedUserStr);
          if (u.role) roleKey = u.role.toLowerCase().replace('_facility', '').replace('_auditor', '');
        } catch { }
      }
      const email = `${roleKey}@pharmasafe.demo`;
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.access_token) {
          this.setToken(data.access_token);
          if (data.user) {
            localStorage.setItem('pharmasafe_user', JSON.stringify(data.user));
          }
          return data.access_token;
        }
      }
    } catch (e) {
      console.warn('Auto-auth attempt failed:', e);
    }
    return null;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    // Auto ensure token for non-auth endpoints
    if (!this.token && !cleanEndpoint.startsWith('/auth/login')) {
      await this.ensureToken();
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const url = `${API_BASE}${cleanEndpoint}`;

    let response = await fetch(url, {
      ...options,
      headers,
    });

    // If 401, re-authenticate and retry once
    if (response.status === 401 && !cleanEndpoint.startsWith('/auth/login')) {
      this.token = null;
      localStorage.removeItem('pharmasafe_token');
      const newToken = await this.ensureToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(url, {
          ...options,
          headers,
        });
      }
    }

    if (!response.ok) {
      let errorDetail = 'API Request Failed';
      try {
        const errorJson = await response.json();
        errorDetail = errorJson.detail || JSON.stringify(errorJson);
      } catch {
        errorDetail = response.statusText;
      }
      throw new Error(`[${response.status}] ${errorDetail}`);
    }

    return response.json();
  }

  // Auth Endpoints
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(res.access_token);
    return res;
  }

  async getCurrentUser() {
    return this.request<any>('/auth/me');
  }

  // Batch Lifecycle & Passport
  async getBatches(statusFilter?: string): Promise<Batch[]> {
    const query = statusFilter && statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
    return this.request<Batch[]>(`/batches${query}`);
  }

  async getBatch(batchNumberOrId: string): Promise<Batch> {
    return this.request<Batch>(`/batches/${batchNumberOrId}`);
  }

  async getBatchPassport(batchNumberOrId: string): Promise<BatchPassport> {
    return this.request<BatchPassport>(`/batches/${batchNumberOrId}/passport`);
  }

  async getBatchEvents(batchNumberOrId: string): Promise<BatchTimelineEvent[]> {
    return this.request<BatchTimelineEvent[]>(`/batches/${batchNumberOrId}/events`);
  }

  async createBatch(batchData: Partial<Batch>): Promise<Batch> {
    return this.request<Batch>('/batches', {
      method: 'POST',
      body: JSON.stringify(batchData),
    });
  }

  async recallBatch(batchId: string, recallReason: string): Promise<Batch> {
    return this.request<Batch>(`/batches/${batchId}/recall`, {
      method: 'POST',
      body: JSON.stringify({ recall_reason: recallReason }),
    });
  }

  async recordCustodyTransfer(batchId: string, data: any): Promise<any> {
    return this.request<any>(`/batches/${batchId}/custody-transfer`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getManufacturerDashboard(): Promise<ManufacturerDashboardData> {
    return this.request<ManufacturerDashboardData>('/dashboard/manufacturer');
  }

  async getDistributorDashboard(): Promise<DistributorDashboardData> {
    return this.request<DistributorDashboardData>('/dashboard/distributor');
  }

  async getPharmacyDashboard(): Promise<PharmacyDashboardData> {
    return this.request<PharmacyDashboardData>('/dashboard/pharmacy');
  }

  async getIncomingTransfers(confirmed?: boolean): Promise<InboundShipmentItem[]> {
    const q = confirmed !== undefined ? `?confirmed=${confirmed}` : '';
    return this.request<InboundShipmentItem[]>(`/inventory/transfers/incoming${q}`);
  }

  async getOutgoingTransfers(): Promise<any[]> {
    return this.request<any[]>('/inventory/transfers/outgoing');
  }

  async receiveTransfer(
    transferId: string,
    verifiedQuantity: number,
    discrepancyNotes?: string,
    locationName?: string
  ): Promise<any> {
    return this.request<any>(`/inventory/transfers/${transferId}/receive`, {
      method: 'POST',
      body: JSON.stringify({
        verified_quantity: verifiedQuantity,
        discrepancy_notes: discrepancyNotes,
        location_name: locationName,
      }),
    });
  }

  async dispatchTransfer(payload: {
    batch_id: string;
    to_organization_id: string;
    quantity: number;
    notes?: string;
    location_name?: string;
  }): Promise<any> {
    return this.request<any>('/inventory/transfers/dispatch', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getInventoryRecords(status?: string, search?: string): Promise<InventoryRecord[]> {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.append('status', status);
    if (search) params.append('search', search);
    const q = params.toString() ? `?${params.toString()}` : '';
    return this.request<InventoryRecord[]>(`/inventory${q}`);
  }

  // Verification & Scanning
  async verifyScan(scannedCode: string, latitude?: number, longitude?: number, codeType: string = 'QR_CODE'): Promise<VerificationScanResult> {
    return this.request<VerificationScanResult>('/verify/scan', {
      method: 'POST',
      body: JSON.stringify({
        scanned_code: scannedCode,
        code_type: codeType,
        latitude,
        longitude,
        device_info: 'PharmaSafe Web Scanner v1.0',
      }),
    });
  }

  // Returns & Reverse Logistics
  async getReturnRequests(): Promise<ReturnRequest[]> {
    return this.request<ReturnRequest[]>('/returns');
  }

  async getReturnById(returnId: string): Promise<ReturnRequest> {
    return this.request<ReturnRequest>(`/returns/${returnId}`);
  }

  async createReturnRequest(
    batchId: string,
    destinationFacilityId: string,
    quantity: number,
    reason: string,
    notes?: string,
    carrierName?: string,
    carrierTrackingRef?: string,
    driverBadge?: string
  ): Promise<ReturnRequest> {
    return this.request<ReturnRequest>('/returns', {
      method: 'POST',
      body: JSON.stringify({
        batch_id: batchId,
        destination_facility_id: destinationFacilityId,
        quantity,
        reason,
        notes,
        carrier_name: carrierName,
        carrier_tracking_ref: carrierTrackingRef,
        driver_badge: driverBadge,
      }),
    });
  }

  async updateReturnStatus(
    returnId: string,
    status: string,
    manifestHash?: string,
    notes?: string,
    receivedQuantity?: number,
    scaleWeightKg?: string,
    carrierName?: string,
    carrierTrackingRef?: string,
    driverBadge?: string
  ): Promise<ReturnRequest> {
    return this.request<ReturnRequest>(`/returns/${returnId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status,
        manifest_hash: manifestHash,
        notes,
        received_quantity: receivedQuantity,
        scale_weight_kg: scaleWeightKg,
        carrier_name: carrierName,
        carrier_tracking_ref: carrierTrackingRef,
        driver_badge: driverBadge,
      }),
    });
  }

  async routeReturnToDisposal(
    returnId: string,
    disposalFacilityId: string,
    carrierName?: string,
    carrierTrackingRef?: string,
    driverBadge?: string,
    notes?: string
  ): Promise<ReturnRequest> {
    return this.request<ReturnRequest>(`/returns/${returnId}/route-to-disposal`, {
      method: 'POST',
      body: JSON.stringify({
        disposal_facility_id: disposalFacilityId,
        carrier_name: carrierName,
        carrier_tracking_ref: carrierTrackingRef,
        driver_badge: driverBadge,
        notes,
      }),
    });
  }

  // Operational Disposal (Phase 7)
  async getDisposalRecords(): Promise<any[]> {
    return this.request<any[]>('/disposal/records');
  }

  async createDisposalIntake(data: {
    return_id?: string;
    batch_id?: string;
    batch_number?: string;
    disposed_quantity: number;
    disposal_method: string;
    scale_weight_kg?: string;
    notes?: string;
  }): Promise<any> {
    return this.request<any>('/disposal/intake', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async completeDisposal(disposalId: string, notes?: string): Promise<any> {
    return this.request<any>(`/disposal/${disposalId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  // Destruction & Dead Batch Registry
  async getDeadBatches(search?: string): Promise<DeadBatch[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<DeadBatch[]>(`/dead-batches${query}`);
  }

  async getReentryIncidents(): Promise<VerificationScanResult[]> {
    return this.request<VerificationScanResult[]>('/dead-batches/alerts/re-entry-incidents');
  }

  async getDestructionRecords(batchId?: string): Promise<DestructionRecord[]> {
    const query = batchId ? `?batch_id=${encodeURIComponent(batchId)}` : '';
    return this.request<DestructionRecord[]>(`/destruction/records${query}`);
  }

  async certifyDestruction(data: Partial<DestructionRecord>): Promise<DestructionRecord> {
    return this.request<DestructionRecord>('/destruction/records', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Dashboard & KPIs
  async getDashboardSummary(): Promise<DashboardSummaryData> {
    return this.request<DashboardSummaryData>('/dashboard/summary');
  }

  async getExpiryTrend(): Promise<{ month: string; count: number }[]> {
    return this.request<{ month: string; count: number }[]>('/dashboard/expiry-trend');
  }

  async getReturnTrend(): Promise<{ month: string; count: number }[]> {
    return this.request<{ month: string; count: number }[]>('/dashboard/return-trend');
  }

  async getReentryTrend(): Promise<{ month: string; count: number }[]> {
    return this.request<{ month: string; count: number }[]>('/dashboard/reentry-trend');
  }

  async getFacilityPerformance(): Promise<any[]> {
    return this.request<any[]>('/dashboard/facility-performance');
  }

  // Alerts
  async getAlerts(severity?: string, isRead?: boolean): Promise<SystemAlertItem[]> {
    const params = new URLSearchParams();
    if (severity && severity !== 'ALL') params.append('severity', severity);
    if (isRead !== undefined) params.append('is_read', String(isRead));
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<SystemAlertItem[]>(`/alerts${query}`);
  }

  async markAlertRead(alertId: string): Promise<SystemAlertItem> {
    return this.request<SystemAlertItem>(`/alerts/${alertId}/read`, {
      method: 'PATCH',
    });
  }

  async resolveAlert(alertId: string): Promise<SystemAlertItem> {
    return this.request<SystemAlertItem>(`/alerts/${alertId}/resolve`, {
      method: 'PATCH',
    });
  }

  async getUnreadAlertCount(): Promise<{ unread_total: number; unread_critical: number }> {
    return this.request<{ unread_total: number; unread_critical: number }>('/alerts/count/unread');
  }

  // Inventory
  async getInventory(orgId?: string): Promise<InventoryItem[]> {
    const query = orgId ? `?org_id=${orgId}` : '';
    return this.request<InventoryItem[]>(`/inventory${query}`);
  }

  async receiveInventory(batchId: string, quantity: number, location?: string): Promise<InventoryItem> {
    return this.request<InventoryItem>('/inventory/receive', {
      method: 'POST',
      body: JSON.stringify({ batch_id: batchId, quantity, location }),
    });
  }

  async transferInventory(batchId: string, toOrgId: string, quantity: number, notes?: string): Promise<InventoryItem> {
    return this.request<InventoryItem>('/inventory/transfer', {
      method: 'POST',
      body: JSON.stringify({ batch_id: batchId, to_org_id: toOrgId, quantity, notes }),
    });
  }

  // Sales & Point-of-Sale Gate
  async verifySaleEligibility(
    batchIdentifier: string,
    quantity: number = 1,
    customerRef?: string
  ): Promise<SaleVerificationResult> {
    return this.request<SaleVerificationResult>('/sales/verify', {
      method: 'POST',
      body: JSON.stringify({
        batch_identifier: batchIdentifier,
        quantity,
        customer_reference: customerRef,
      }),
    });
  }

  async authorizeSale(
    batchIdentifier: string,
    quantity: number,
    customerRef?: string
  ): Promise<any> {
    return this.request<any>('/sales', {
      method: 'POST',
      body: JSON.stringify({
        batch_identifier: batchIdentifier,
        quantity,
        customer_reference: customerRef,
      }),
    });
  }

  async recordSale(payload: { batch_id?: string; batch_number?: string; batch_identifier?: string; quantity: number; customer_reference?: string }): Promise<any> {
    return this.request<any>('/sales', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getSalesHistory(
    batchId?: string,
    saleAllowed?: boolean,
    search?: string,
    limit: number = 50
  ): Promise<SaleTransactionRecord[]> {
    const params = new URLSearchParams();
    if (batchId) params.append('batch_id', batchId);
    if (saleAllowed !== undefined) params.append('sale_allowed', String(saleAllowed));
    if (search) params.append('search', search);
    params.append('limit', String(limit));
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<SaleTransactionRecord[]>(`/sales${query}`);
  }

  // Organizations & Medicines
  async getOrganizations(typeFilter?: string): Promise<any[]> {
    const query = typeFilter ? `?type=${typeFilter}` : '';
    return this.request<any[]>(`/organizations${query}`);
  }

  async getMedicines(): Promise<any[]> {
    return this.request<any[]>('/medicines');
  }

  // AI & Risk Intelligence
  async getBatchRiskScore(batchIdOrNumber: string): Promise<RiskScoreReport> {
    return this.request<RiskScoreReport>(`/intelligence/risk-score/${batchIdOrNumber}`);
  }

  async evaluateBatchRisk(batchIdOrNumber: string): Promise<BatchRiskEvaluation> {
    return this.request<BatchRiskEvaluation>(`/intelligence/evaluate/${batchIdOrNumber}`);
  }

  async simulateBatchRisk(payload: BatchSimulationRequest): Promise<BatchRiskEvaluation> {
    return this.request<BatchRiskEvaluation>('/intelligence/simulate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getIntelligenceSummary(): Promise<IntelligenceSummary> {
    return this.request<IntelligenceSummary>('/intelligence/summary');
  }

  async getAnomalies(): Promise<AnomalyItem[]> {
    return this.request<AnomalyItem[]>('/intelligence/anomalies');
  }

  async getOnlineSurveillance(highRiskOnly: boolean = false): Promise<OnlineSurveillanceItem[]> {
    const query = highRiskOnly ? '?high_risk_only=true' : '';
    return this.request<OnlineSurveillanceItem[]>(`/intelligence/online-surveillance${query}`);
  }

  async ingestOnlineSurveillance(data: Partial<OnlineSurveillanceItem>): Promise<OnlineSurveillanceItem> {
    return this.request<OnlineSurveillanceItem>('/intelligence/online-surveillance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Audit & Compliance
  async getAuditLogs(limit: number = 50, offset: number = 0): Promise<AuditLogItem[]> {
    return this.request<AuditLogItem[]>(`/audit/logs?limit=${limit}&offset=${offset}`);
  }

  async getComplianceSummary(): Promise<ComplianceSummary> {
    return this.request<ComplianceSummary>('/audit/compliance/summary');
  }

  // ─── Phase 8: Destruction Certificate + Dead Batch Registry ──────────────────

  async createDestructionRecord(payload: {
    batch_id: string;
    disposal_id?: string;
    return_id?: string;
    quantity_destroyed: number;
    destruction_method: string;
    witness_name: string;
    witness_badge_id: string;
    scale_weight_kg?: string;
    evidence_reference?: string;
    evidence_media_url?: string;
    facility_notes?: string;
  }): Promise<DestructionRecord> {
    return this.request<DestructionRecord>('/destruction/records', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async verifyDestructionCertificate(recordId: string): Promise<{
    success: boolean;
    certificate_id?: string;
    batch_id?: string;
    batch_number?: string;
    destroyed_quantity?: number;
    verification_status: string;
    certificate_hash?: string;
    hash_valid?: boolean;
    batch_status?: string;
    dead_batch_registry_id?: string;
    message: string;
    error_code?: string;
  }> {
    return this.request(`/destruction/records/${recordId}/verify`, {
      method: 'POST',
    });
  }

  async getDestructionRecordById(recordId: string): Promise<DestructionRecord> {
    return this.request<DestructionRecord>(`/destruction/records/${recordId}`);
  }

  async getDeadBatchByBatchNumber(batchNumber: string): Promise<DeadBatch> {
    return this.request<DeadBatch>(`/dead-batches/${batchNumber}`);
  }

  // ─── Phase 9: Online Medicine Safety + Listing Verification ──────────────

  async verifyOnlineListing(payload: ListingVerificationRequest): Promise<ListingVerificationResponse> {
    return this.request<ListingVerificationResponse>('/online-safety/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async createOnlineListing(payload: ListingVerificationRequest): Promise<OnlineMedicineListing> {
    return this.request<OnlineMedicineListing>('/online-safety/listings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getOnlineListings(params?: {
    decision?: string;
    risk_level?: string;
    platform?: string;
    batch_number?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<OnlineMedicineListing[]> {
    const urlParams = new URLSearchParams();
    if (params?.decision && params.decision !== 'ALL') urlParams.append('decision', params.decision);
    if (params?.risk_level && params.risk_level !== 'ALL') urlParams.append('risk_level', params.risk_level);
    if (params?.platform && params.platform !== 'ALL') urlParams.append('platform', params.platform);
    if (params?.batch_number) urlParams.append('batch_number', params.batch_number);
    if (params?.search) urlParams.append('search', params.search);
    if (params?.limit) urlParams.append('limit', String(params.limit));
    if (params?.offset) urlParams.append('offset', String(params.offset));
    const query = urlParams.toString() ? `?${urlParams.toString()}` : '';
    return this.request<OnlineMedicineListing[]>(`/online-safety/listings${query}`);
  }

  async getOnlineListingById(id: string): Promise<OnlineMedicineListing> {
    return this.request<OnlineMedicineListing>(`/online-safety/listings/${id}`);
  }

  async enforceOnlineListingAction(
    id: string,
    action: string,
    notes?: string
  ): Promise<OnlineMedicineListing> {
    return this.request<OnlineMedicineListing>(`/online-safety/listings/${id}/enforce`, {
      method: 'POST',
      body: JSON.stringify({ action, enforcement_notes: notes }),
    });
  }

  async getOnlineSafetySummary(): Promise<OnlineSafetySummary> {
    return this.request<OnlineSafetySummary>('/online-safety/summary');
  }

  async getPharmacyExpirySurveillance(): Promise<PharmacyExpirySurveillanceResponse> {
    return this.request<PharmacyExpirySurveillanceResponse>('/intelligence/pharmacy-expiry-surveillance');
  }

  async dispatchPharmacyRecallDirective(payload: DispatchRecallDirectivePayload): Promise<DispatchRecallDirectiveResponse> {
    return this.request<DispatchRecallDirectiveResponse>('/intelligence/dispatch-pharmacy-recall-directive', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getCrossTierStream(): Promise<CrossTierStreamResponse> {
    return this.request<CrossTierStreamResponse>('/dashboard/cross-tier-stream');
  }

  // ── Phase 11: Advanced Evidence & Analytics ─────────────────────────────

  async getEvidenceList(params?: { entity_id?: string; entity_type?: string; status?: string }): Promise<EvidenceItem[]> {
    const urlParams = new URLSearchParams();
    if (params?.entity_id) urlParams.append('entity_id', params.entity_id);
    if (params?.entity_type) urlParams.append('entity_type', params.entity_type);
    if (params?.status) urlParams.append('status', params.status);
    const query = urlParams.toString() ? `?${urlParams.toString()}` : '';
    return this.request<EvidenceItem[]>(`/evidence${query}`);
  }

  async getEvidenceById(id: string): Promise<EvidenceItem> {
    return this.request<EvidenceItem>(`/evidence/${id}`);
  }

  async uploadEvidence(formData: FormData): Promise<EvidenceItem> {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE}/evidence/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(errorData.detail || `Upload failed with status ${response.status}`);
    }
    return response.json();
  }

  async runEvidenceOCR(id: string, force: boolean = false): Promise<EvidenceItem> {
    return this.request<EvidenceItem>(`/evidence/${id}/ocr?force=${force}`, {
      method: 'POST',
    });
  }

  async comparePackageEvidence(payload: {
    evidence_id: string;
    batch_id?: string;
    batch_number?: string;
    claimed_data?: Record<string, any>;
  }): Promise<PackageComparisonResult> {
    return this.request<PackageComparisonResult>('/evidence/compare-package', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async deleteEvidence(id: string): Promise<{ message: string; evidence_id: string }> {
    return this.request<{ message: string; evidence_id: string }>(`/evidence/${id}`, {
      method: 'DELETE',
    });
  }

  async getInvestigations(params?: { status?: string; priority?: string; entity_id?: string }): Promise<InvestigationCaseSummary[]> {
    const urlParams = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') urlParams.append('status', params.status);
    if (params?.priority && params.priority !== 'ALL') urlParams.append('priority', params.priority);
    if (params?.entity_id) urlParams.append('entity_id', params.entity_id);
    const query = urlParams.toString() ? `?${urlParams.toString()}` : '';
    return this.request<InvestigationCaseSummary[]>(`/investigations${query}`);
  }

  async getInvestigationCase(caseIdOrNum: string): Promise<InvestigationCaseDetail> {
    return this.request<InvestigationCaseDetail>(`/investigations/${caseIdOrNum}`);
  }

  async createInvestigationCase(payload: any): Promise<InvestigationCaseSummary> {
    return this.request<InvestigationCaseSummary>('/investigations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateInvestigationStatus(caseId: string, status: string, notes?: string): Promise<InvestigationCaseDetail> {
    return this.request<InvestigationCaseDetail>(`/investigations/${caseId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  }

  async addInvestigationNote(caseId: string, note: {
    content: string;
    author_name?: string;
    author_role?: string;
    is_evidence_flag?: boolean;
  }): Promise<InvestigationNote> {
    return this.request<InvestigationNote>(`/investigations/${caseId}/notes`, {
      method: 'POST',
      body: JSON.stringify(note),
    });
  }

  async linkEvidenceToCase(caseId: string, link: { evidence_id: string; relevance_notes?: string }): Promise<any> {
    return this.request<any>(`/investigations/${caseId}/evidence`, {
      method: 'POST',
      body: JSON.stringify(link),
    });
  }

  async getAnalyticsOverview(): Promise<AnalyticsOverview> {
    return this.request<AnalyticsOverview>('/analytics/overview');
  }

  async getForwardSupplyAnalytics(): Promise<ForwardSupplyAnalytics> {
    return this.request<ForwardSupplyAnalytics>('/analytics/forward-supply');
  }

  async getReverseLogisticsAnalytics(): Promise<ReverseLogisticsAnalytics> {
    return this.request<ReverseLogisticsAnalytics>('/analytics/reverse-logistics');
  }

  async getDisposalThroughputAnalytics(): Promise<DisposalThroughputAnalytics> {
    return this.request<DisposalThroughputAnalytics>('/analytics/disposal-throughput');
  }

  async getDestructionAnalytics(): Promise<DestructionAnalytics> {
    return this.request<DestructionAnalytics>('/analytics/destruction');
  }

  async getOnlineMarketplaceAnalytics(): Promise<OnlineMarketplaceAnalytics> {
    return this.request<OnlineMarketplaceAnalytics>('/analytics/online-marketplace');
  }

  async getAIRiskAnalytics(): Promise<AIRiskAnalytics> {
    return this.request<AIRiskAnalytics>('/analytics/ai-risk');
  }

  async getComplianceAnalytics(): Promise<ComplianceAnalytics> {
    return this.request<ComplianceAnalytics>('/analytics/compliance');
  }

  async getGeospatialTelemetry(): Promise<GeospatialTelemetryPoint[]> {
    return this.request<GeospatialTelemetryPoint[]>('/analytics/geospatial-telemetry');
  }

  async getBatchInvestigationReport(batchId: string, generatedBy?: string): Promise<BatchInvestigationReport> {
    return this.request<BatchInvestigationReport>(`/reports/batch/${batchId}`, {
      method: 'POST',
      body: JSON.stringify({ generated_by: generatedBy || 'Regulatory Compliance Auditor' }),
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
