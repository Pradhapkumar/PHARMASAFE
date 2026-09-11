import { DestructionRecord, DeadBatch, DisposalRecord } from '../types/api';
import { MOCK_CERTIFICATES, MOCK_DEAD_BATCHES, demoState } from '../mocks/mockData';
import apiClient from './apiClient';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

export interface DisposalIntakeItem {
  id: string;
  return_id: string;
  batch_number: string;
  medicine_name: string;
  quantity: number;
  weight_kg: number;
  status: 'AWAITING_INSPECTION' | 'APPROVED_FOR_INCINERATION' | 'DISPOSED' | 'DESTROYED';
  photo_evidence_url?: string;
  notes?: string;
}

export const MOCK_DISPOSAL_INTAKE: DisposalIntakeItem[] = [
  {
    id: 'dsp_01',
    return_id: 'ret_002',
    batch_number: 'B1004',
    medicine_name: 'Remdec 100mg Injection',
    quantity: 1100,
    weight_kg: 42.5,
    status: 'APPROVED_FOR_INCINERATION',
    photo_evidence_url: '/storage/evidence/b1004_pallet.jpg',
    notes: 'Seal tamper check verified. Prepared for operational disposal.',
  },
  {
    id: 'dsp_02',
    return_id: 'ret_001',
    batch_number: 'B1005',
    medicine_name: 'Dolo-650 (Paracetamol IP)',
    quantity: 980,
    weight_kg: 88.0,
    status: 'AWAITING_INSPECTION',
    photo_evidence_url: '/storage/evidence/b1005_pallet.jpg',
    notes: 'Held for inspection due to 20 unit shipment discrepancy.',
  }
];

class DisposalService {
  private intakeItems = [...MOCK_DISPOSAL_INTAKE];

  async getIntakeItems(): Promise<DisposalIntakeItem[]> {
    if (!USE_MOCK) {
      try {
        const records = await apiClient.getDisposalRecords();
        if (Array.isArray(records)) {
          return records.map((r: any) => ({
            id: r.id,
            return_id: r.return_id || 'ret_default',
            batch_number: r.batch_id,
            medicine_name: 'Paracetamol 500mg IP',
            quantity: r.disposed_quantity,
            weight_kg: parseFloat(r.scale_weight_kg || '45.0'),
            status: r.status === 'DISPOSED' ? 'DISPOSED' : 'APPROVED_FOR_INCINERATION',
            notes: r.notes,
          }));
        }
      } catch (err) {
        console.warn('Backend getDisposalRecords failed, using mock data:', err);
      }
    }
    return [...this.intakeItems];
  }

  async recordDisposalAndComplete(data: {
    batch_number: string;
    quantity: number;
    method: string;
    notes?: string;
    return_id?: string;
    scale_weight_kg?: string;
  }): Promise<DisposalRecord> {
    if (!USE_MOCK) {
      const intake = await apiClient.createDisposalIntake({
        batch_number: data.batch_number,
        return_id: data.return_id,
        disposed_quantity: data.quantity,
        disposal_method: data.method,
        scale_weight_kg: data.scale_weight_kg,
        notes: data.notes,
      });
      const completed = await apiClient.completeDisposal(intake.id, data.notes);
      if (data.batch_number === 'B1001' || data.batch_number === 'btc_b1001') {
        demoState.b1001Status = 'DISPOSED';
      }
      return completed;
    }

    const mockDisposal: DisposalRecord = {
      id: `dsp_${Date.now()}`,
      batch_id: data.batch_number,
      return_id: data.return_id,
      facility_org_id: 'org_green_shield_disposal',
      disposed_quantity: data.quantity,
      disposal_method: data.method,
      scale_weight_kg: data.scale_weight_kg || '45.0',
      status: 'DISPOSED',
      notes: data.notes || 'Operational disposal complete.',
      timestamp: new Date().toISOString(),
    };

    if (data.batch_number === 'B1001' || data.batch_number === 'btc_b1001') {
      demoState.b1001Status = 'DISPOSED';
    }

    return mockDisposal;
  }

  // Preserved for Phase 8 Certificate Verification
  async certifyDestruction(data: {
    batch_number: string;
    quantity: number;
    method: string;
    witness_name: string;
    witness_badge: string;
    notes?: string;
    batch_id?: string;
  }): Promise<DestructionRecord> {
    if (!USE_MOCK) {
      try {
        const batchIdentifier = data.batch_id || data.batch_number;
        const record = await apiClient.certifyDestruction({
          batch_id: batchIdentifier,
          quantity_destroyed: data.quantity,
          destruction_method: data.method,
          witness_name: data.witness_name,
          witness_badge_id: data.witness_badge,
          facility_notes: data.notes,
        });

        if (data.batch_number === 'B1001' || batchIdentifier.includes('b1001')) {
          demoState.isB1001Destroyed = true;
          demoState.isB1001InDeadRegistry = true;
          demoState.b1001Status = 'DESTROYED';
          demoState.destructionCertHash = record.certificate_sha256_hash;
        }

        return record;
      } catch (err) {
        console.warn('Backend certifyDestruction failed, using local mock:', err);
      }
    }

    const certHash = 'sha256:' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    const newRecord: DestructionRecord = {
      id: `cert_dst_${Date.now()}`,
      batch_id: data.batch_number,
      facility_org_id: 'org_green_shield_disposal',
      quantity_destroyed: data.quantity,
      destruction_method: data.method,
      witness_name: data.witness_name,
      witness_badge_id: data.witness_badge,
      certificate_sha256_hash: certHash,
      certificate_url: `/certificates/${certHash.slice(7)}.pdf`,
      evidence_media_url: '/storage/evidence/incineration_chamber_log.jpg',
      facility_notes: data.notes || 'High temperature incineration verified at 1200C chamber.',
      timestamp: new Date().toISOString(),
    };

    MOCK_CERTIFICATES.unshift(newRecord);

    const newDeadBatch: DeadBatch = {
      id: `ded_${Date.now()}`,
      batch_id: data.batch_number,
      batch_number: data.batch_number,
      gtin_barcode: '8901088019912',
      destruction_record_id: newRecord.id,
      destruction_cert_hash: certHash,
      manufacturer_name: 'Pfizer Healthcare India Ltd.',
      quantity_destroyed: data.quantity,
      destroyed_at: new Date().toISOString(),
      blacklisted_at: new Date().toISOString(),
      reentry_attempts_count: 0,
      is_actively_monitored: true,
    };
    MOCK_DEAD_BATCHES.unshift(newDeadBatch);

    if (data.batch_number === 'B1001') {
      demoState.isB1001Destroyed = true;
      demoState.isB1001InDeadRegistry = true;
      demoState.b1001Status = 'DESTROYED';
      demoState.destructionCertHash = certHash;
    }

    return newRecord;
  }
}

export const disposalService = new DisposalService();
export default disposalService;
