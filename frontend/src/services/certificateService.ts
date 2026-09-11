import { DestructionRecord, DeadBatch } from '../types/api';
import { MOCK_CERTIFICATES, MOCK_DEAD_BATCHES, demoState } from '../mocks/mockData';
import apiClient from './apiClient';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

class CertificateService {
  async getCertificates(): Promise<DestructionRecord[]> {
    if (!USE_MOCK) {
      try {
        const records = await apiClient.getDestructionRecords();
        if (Array.isArray(records)) {
          return records;
        }
      } catch (err) {
        console.warn('Backend /destruction/records failed, using mock data:', err);
      }
    }
    return [...MOCK_CERTIFICATES];
  }

  async getDeadBatches(): Promise<DeadBatch[]> {
    if (!USE_MOCK) {
      try {
        const deadBatches = await apiClient.getDeadBatches();
        if (Array.isArray(deadBatches)) {
          return deadBatches;
        }
      } catch (err) {
        console.warn('Backend /dead-batches failed, using mock data:', err);
      }
    }

    // Dynamic inclusion of B1001 if destroyed in mock mode
    if (demoState.isB1001InDeadRegistry) {
      const exists = MOCK_DEAD_BATCHES.find(b => b.batch_number === 'B1001');
      if (!exists) {
        MOCK_DEAD_BATCHES.unshift({
          id: 'ded_b1001',
          batch_id: 'btc_b1001',
          batch_number: 'B1001',
          gtin_barcode: '8901088019912',
          destruction_record_id: 'cert_dst_b1001',
          destruction_cert_hash: demoState.destructionCertHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          manufacturer_name: 'Pfizer Healthcare India Ltd.',
          quantity_destroyed: 1000,
          destroyed_at: new Date().toISOString(),
          blacklisted_at: new Date().toISOString(),
          reentry_attempts_count: demoState.reentryDetected ? 1 : 0,
          last_reentry_detected_at: demoState.reentryDetected ? new Date().toISOString() : undefined,
          is_actively_monitored: true,
        });
      }
    }
    return [...MOCK_DEAD_BATCHES];
  }

  async verifyCertificateHash(hashQuery: string): Promise<{
    isValid: boolean;
    batchMatch: boolean;
    quantityMatch: boolean;
    dateValid: boolean;
    facilityVerified: boolean;
    certificate?: DestructionRecord;
  }> {
    const certs = await this.getCertificates();
    const q = hashQuery.trim().toLowerCase();
    const cert = certs.find(c => 
      c.certificate_sha256_hash.toLowerCase().includes(q) || 
      c.batch_id.toLowerCase() === q ||
      c.id.toLowerCase() === q
    );

    if (cert) {
      return {
        isValid: true,
        batchMatch: true,
        quantityMatch: true,
        dateValid: true,
        facilityVerified: true,
        certificate: cert,
      };
    }

    return {
      isValid: false,
      batchMatch: false,
      quantityMatch: false,
      dateValid: false,
      facilityVerified: false,
    };
  }
}

export const certificateService = new CertificateService();
export default certificateService;
