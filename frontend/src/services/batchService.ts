import { Batch, BatchPassport, VerificationScanResult, BatchTimelineEvent } from '../types/api';
import { MOCK_BATCHES, getMockBatchPassport, demoState } from '../mocks/mockData';
import apiClient from './apiClient';

export type { Batch, BatchPassport, VerificationScanResult, BatchTimelineEvent };

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

class BatchService {
  private batches: Batch[] = [...MOCK_BATCHES];

  async getBatches(statusFilter?: string, search?: string): Promise<Batch[]> {
    if (!USE_MOCK) {
      try {
        const queryParams = new URLSearchParams();
        if (statusFilter && statusFilter !== 'ALL') queryParams.append('status', statusFilter);
        if (search) queryParams.append('search', search);
        const qStr = queryParams.toString() ? `?${queryParams.toString()}` : '';
        const apiBatches = await apiClient.request<Batch[]>(`/batches${qStr}`);
        if (Array.isArray(apiBatches)) {
          return apiBatches;
        }
      } catch (err) {
        console.warn('Backend /batches request failed, falling back to mock data:', err);
      }
    }

    // Dynamic sync for B1001 with demoState
    const b1001 = this.batches.find(b => b.batch_number === 'B1001');
    if (b1001) {
      b1001.status = demoState.b1001Status;
      b1001.expiry_date = demoState.b1001Expiry;
    }

    let filtered = [...this.batches];
    if (statusFilter && statusFilter !== 'ALL') {
      filtered = filtered.filter(b => b.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        b =>
          b.batch_number.toLowerCase().includes(q) ||
          b.gtin_barcode.toLowerCase().includes(q)
      );
    }
    return filtered;
  }

  async getBatchByNumber(batchNumber: string): Promise<Batch | undefined> {
    return this.getBatchById(batchNumber);
  }

  async getBatchById(batchIdOrNumber: string): Promise<Batch | undefined> {
    if (!USE_MOCK) {
      try {
        return await apiClient.getBatch(batchIdOrNumber);
      } catch (err) {
        console.warn(`Backend /batches/${batchIdOrNumber} failed, checking local mock:`, err);
      }
    }
    const batches = await this.getBatches();
    return batches.find(
      b => b.id === batchIdOrNumber || b.batch_number.toUpperCase() === batchIdOrNumber.toUpperCase()
    );
  }

  async getBatchEvents(batchIdOrNumber: string): Promise<BatchTimelineEvent[]> {
    if (!USE_MOCK) {
      try {
        const events = await apiClient.getBatchEvents(batchIdOrNumber);
        if (Array.isArray(events) && events.length > 0) return events;
      } catch (err) {
        console.warn(`Backend /batches/${batchIdOrNumber}/events failed, using fallback:`, err);
      }
    }

    const batch = await this.getBatchById(batchIdOrNumber);
    const now = new Date().toISOString();
    return [
      {
        id: `evt_mock_mfg_${batchIdOrNumber}`,
        stage: 'MANUFACTURED',
        title: 'Batch Cataloged & Cryptographic GTIN Issued',
        event_type: 'MANUFACTURED',
        timestamp: batch?.mfg_date ? `${batch.mfg_date}T09:00:00Z` : now,
        actor: 'Quality Assurance Director',
        organization: 'Pfizer Healthcare India Ltd.',
        quantity: batch?.initial_quantity || 1000,
        location: 'Mumbai Production Facility',
        status: 'COMPLETED',
        previous_status: undefined,
        new_status: 'MANUFACTURED',
        details: `Batch ${batchIdOrNumber} manufactured and inscribed with GTIN ${batch?.gtin_barcode || '8901088'}.`,
      },
    ];
  }

  async prepareDistribution(data: {
    batch_id: string;
    to_org_id: string;
    quantity: number;
    notes?: string;
  }): Promise<any> {
    if (!USE_MOCK) {
      return await apiClient.recordCustodyTransfer(data.batch_id, {
        batch_id: data.batch_id,
        stage: 'MANUFACTURE_TO_DISTRIBUTOR',
        to_organization_id: data.to_org_id,
        transferred_quantity: data.quantity,
        location_name: 'Manufacturer Outbound Dispatch Bay',
        discrepancy_notes: data.notes,
      });
    }

    const batch = this.batches.find(b => b.id === data.batch_id || b.batch_number === data.batch_id);
    if (batch) {
      batch.status = 'IN_DISTRIBUTION';
      batch.current_custodian_id = data.to_org_id;
    }
    return { success: true, transferred_quantity: data.quantity };
  }

  async getBatchPassport(batchNumber: string): Promise<BatchPassport> {
    if (!USE_MOCK) {
      try {
        return await apiClient.getBatchPassport(batchNumber);
      } catch (err) {
        console.warn(`Backend /batches/${batchNumber}/passport failed, falling back to mock:`, err);
      }
    }
    return getMockBatchPassport(batchNumber);
  }

  async registerBatch(data: Partial<Batch>): Promise<Batch> {
    const payload = {
      ...data,
      gtin_barcode: data.gtin_barcode || `0890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    };
    if (!USE_MOCK) {
      return await apiClient.createBatch(payload);
    }

    const newBatch: Batch = {
      id: `btc_${Date.now()}`,
      batch_number: payload.batch_number || `BAT-${Math.floor(1000 + Math.random() * 9000)}`,
      gtin_barcode: payload.gtin_barcode,
      medicine_id: payload.medicine_id || 'med_custom',
      manufacturer_id: 'org_pfizer_india',
      mfg_date: payload.mfg_date || new Date().toISOString().split('T')[0],
      expiry_date: payload.expiry_date || '2027-01-01',
      initial_quantity: payload.initial_quantity || 1000,
      current_quantity: payload.initial_quantity || 1000,
      unit: payload.unit || 'BOX',
      status: 'MANUFACTURED',
      current_custodian_id: 'org_pfizer_india',
      is_recalled: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.batches.unshift(newBatch);
    return newBatch;
  }

  async recallBatch(batchId: string, reason: string): Promise<Batch> {
    if (!USE_MOCK) {
      return await apiClient.recallBatch(batchId, reason);
    }

    const batch = this.batches.find(b => b.id === batchId || b.batch_number === batchId);
    if (!batch) throw new Error('Batch not found');
    batch.is_recalled = true;
    batch.recall_reason = reason;
    batch.status = 'RECALLED';
    return batch;
  }

  async verifyMedicineScan(scannedCode: string, latitude?: number, longitude?: number): Promise<VerificationScanResult> {
    if (!USE_MOCK) {
      try {
        const result = await apiClient.verifyScan(scannedCode, latitude, longitude);
        if (result) return result;
      } catch (err) {
        console.warn('Backend /verify/scan failed, falling back to mock rules:', err);
      }
    }

    const code = scannedCode.trim().toUpperCase();
    const now = new Date().toISOString();
    const scanId = `scn_${Math.floor(100000 + Math.random() * 900000)}`;

    // Special check for B1001 with demo state
    if (code === 'B1001' || code.includes('B1001')) {
      if (demoState.isB1001InDeadRegistry || demoState.reentryDetected) {
        return {
          verification_status: 'DEAD_BATCH_REENTRY_DETECTED',
          batch_number: 'B1001',
          brand_name: 'Paracetamol 500mg IP (DESTROYED)',
          generic_name: 'Paracetamol',
          manufacturer_name: 'Pfizer Healthcare India Ltd.',
          is_expired: true,
          is_recalled: true,
          is_dead_batch_reentry: true,
          warning_message: 'CRITICAL SECURITY ALERT: Batch B1001 was officially incinerated/destroyed on certificate and inscribed in the Dead Batch Registry. Do NOT dispense!',
          timestamp: now,
          scan_id: scanId,
        };
      }

      if (demoState.b1001Status === 'EXPIRED') {
        return {
          verification_status: 'EXPIRED',
          batch_number: 'B1001',
          brand_name: 'Paracetamol 500mg IP',
          generic_name: 'Paracetamol',
          manufacturer_name: 'Pfizer Healthcare India Ltd.',
          is_expired: true,
          is_recalled: false,
          is_dead_batch_reentry: false,
          warning_message: 'EXPIRY WARNING: Batch B1001 reached expiration on ' + demoState.b1001Expiry + '. Point-of-Sale is blocked. Quarantine stock immediately.',
          timestamp: now,
          scan_id: scanId,
        };
      }

      return {
        verification_status: 'AUTHENTIC',
        batch_number: 'B1001',
        brand_name: 'Paracetamol 500mg IP',
        generic_name: 'Paracetamol',
        manufacturer_name: 'Pfizer Healthcare India Ltd.',
        is_expired: false,
        is_recalled: false,
        is_dead_batch_reentry: false,
        warning_message: undefined,
        timestamp: now,
        scan_id: scanId,
      };
    }

    // Check Dead Batch B9001
    if (code === 'B9001') {
      return {
        verification_status: 'DEAD_BATCH_REENTRY_DETECTED',
        batch_number: 'B9001',
        brand_name: 'Ciprofloxacin 500mg (DEAD BATCH)',
        manufacturer_name: 'Pfizer Healthcare India Ltd.',
        is_expired: true,
        is_recalled: true,
        is_dead_batch_reentry: true,
        warning_message: 'CRITICAL ALERT: Inscribed in Dead Batch Registry. Certified destroyed at GreenShield Incinerator.',
        timestamp: now,
        scan_id: scanId,
      };
    }

    // Check Expired B1003
    if (code === 'B1003') {
      return {
        verification_status: 'EXPIRED',
        batch_number: 'B1003',
        brand_name: 'Azithral 250 (Azithromycin)',
        manufacturer_name: 'Pfizer Healthcare India Ltd.',
        is_expired: true,
        is_recalled: false,
        is_dead_batch_reentry: false,
        warning_message: 'EXPIRY ALERT: Batch expired on 10/01/2024. Sale blocked.',
        timestamp: now,
        scan_id: scanId,
      };
    }

    // Check Recalled B1004
    if (code === 'B1004') {
      return {
        verification_status: 'RECALLED',
        batch_number: 'B1004',
        brand_name: 'Remdec 100mg (Remdesivir)',
        manufacturer_name: 'Pfizer Healthcare India Ltd.',
        is_expired: false,
        is_recalled: true,
        is_dead_batch_reentry: false,
        warning_message: 'RECALL WARNING: Mandatory manufacturer safety recall. Return to distribution immediately.',
        timestamp: now,
        scan_id: scanId,
      };
    }

    // Default Unknown
    return {
      verification_status: 'UNKNOWN_NOT_FOUND',
      batch_number: code,
      is_expired: false,
      is_recalled: false,
      is_dead_batch_reentry: false,
      warning_message: 'UNREGISTERED CODE: Batch not located in National PharmaSafe Ledger. High probability of counterfeit.',
      timestamp: now,
      scan_id: scanId,
    };
  }
}

export const batchService = new BatchService();
export default batchService;
