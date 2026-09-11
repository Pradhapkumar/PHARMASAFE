import { InboundShipmentItem, InventoryRecord } from '../types/api';
import apiClient from './apiClient';

export type { InboundShipmentItem, InventoryRecord };
export type InboundBatchItem = InboundShipmentItem;

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

export const MOCK_INBOUND_BATCHES: InboundShipmentItem[] = [
  {
    id: 'inb_01',
    batch_id: 'btc_dolo_1005',
    batch_number: 'B1005',
    medicine_name: 'Dolo-650 (Paracetamol IP)',
    medicine_generic_name: 'Paracetamol',
    dosage_form: 'Tablet',
    sender_org: 'Sun Pharma Distribution Depot',
    from_organization_id: 'org_sun_pharma',
    to_organization_id: 'org_apollo_logistics',
    expected_quantity: 1000,
    received_quantity: 980,
    discrepancy: -20,
    has_discrepancy: true,
    discrepancy_notes: 'Physical count discrepancy: expected 1000 units, received 980 units (Variance: -20).',
    expiry_date: '2026-08-01',
    stage: 'MANUFACTURE_TO_DISTRIBUTOR',
    is_confirmed: false,
    status: 'DISCREPANCY_FLAGGED',
    timestamp: '2026-09-08T10:30:00Z',
  },
  {
    id: 'inb_02',
    batch_id: 'btc_amox_1002',
    batch_number: 'B1002',
    medicine_name: 'Amoxil 500mg',
    medicine_generic_name: 'Amoxicillin Trihydrate',
    dosage_form: 'Capsule',
    sender_org: 'Pfizer Healthcare India Ltd.',
    from_organization_id: 'org_pfizer_india',
    to_organization_id: 'org_apollo_logistics',
    expected_quantity: 5000,
    received_quantity: 5000,
    discrepancy: 0,
    has_discrepancy: false,
    expiry_date: '2027-04-01',
    stage: 'MANUFACTURE_TO_DISTRIBUTOR',
    is_confirmed: false,
    status: 'VERIFIED',
    timestamp: '2026-09-09T14:15:00Z',
  },
  {
    id: 'inb_03',
    batch_id: 'btc_b1001_paracet',
    batch_number: 'B1001',
    medicine_name: 'Paracetamol 500mg IP',
    medicine_generic_name: 'Paracetamol',
    dosage_form: 'Tablet',
    sender_org: 'Pfizer Healthcare India Ltd.',
    from_organization_id: 'org_pfizer_india',
    to_organization_id: 'org_apollo_logistics',
    expected_quantity: 800,
    received_quantity: 800,
    discrepancy: 0,
    has_discrepancy: false,
    expiry_date: '2026-10-30',
    stage: 'MANUFACTURE_TO_DISTRIBUTOR',
    is_confirmed: false,
    status: 'VERIFIED',
    timestamp: '2026-09-10T08:00:00Z',
  }
];

class InventoryService {
  private inboundItems: InboundShipmentItem[] = [...MOCK_INBOUND_BATCHES];

  async getInboundShipments(confirmed?: boolean): Promise<InboundShipmentItem[]> {
    if (!USE_MOCK) {
      try {
        const res: any = await apiClient.getIncomingTransfers(confirmed);
        if (Array.isArray(res) && res.length > 0) {
          return res.map((t: any) => ({
            id: t.id,
            batch_id: t.batch_id,
            batch_number: t.batch_number || 'Unknown',
            gtin_barcode: t.gtin_barcode || 'GS1-Compliant',
            medicine_name: t.medicine_name || t.medicine_brand_name || 'Pharmaceutical Item',
            medicine_generic_name: t.medicine_generic_name,
            dosage_form: t.dosage_form,
            sender_org: t.sender_org || t.from_organization_name || 'Origin Facility',
            from_organization_id: t.from_organization_id,
            to_organization_id: t.to_organization_id,
            expected_quantity: Number(t.expected_quantity ?? t.transferred_quantity ?? t.quantity ?? 0),
            received_quantity: Number(t.received_quantity ?? t.verified_quantity ?? 0),
            discrepancy: Number(t.discrepancy ?? (t.verified_quantity != null ? t.verified_quantity - t.transferred_quantity : 0)),
            has_discrepancy: Boolean(t.has_discrepancy || (t.verified_quantity != null && t.verified_quantity !== t.transferred_quantity)),
            discrepancy_notes: t.discrepancy_notes,
            expiry_date: t.expiry_date || 'N/A',
            stage: t.stage || 'MANUFACTURE_TO_DISTRIBUTOR',
            is_confirmed: Boolean(t.is_confirmed),
            status: (t.has_discrepancy || (t.verified_quantity != null && t.verified_quantity !== t.transferred_quantity))
              ? 'DISCREPANCY_FLAGGED'
              : (t.is_confirmed ? 'VERIFIED' : 'PENDING'),
            timestamp: t.timestamp || new Date().toISOString(),
          }));
        }
      } catch (err) {
        console.warn('Backend incoming transfers failed, using mock fallback:', err);
      }
    }
    return [...this.inboundItems];
  }

  async getOutgoingShipments(): Promise<any[]> {
    if (!USE_MOCK) {
      try {
        const res = await apiClient.getOutgoingTransfers();
        if (Array.isArray(res)) return res;
      } catch (err) {
        console.warn('Backend outgoing transfers failed, using mock fallback:', err);
      }
    }
    return [];
  }

  async receiveShipment(
    transferId: string,
    verifiedQuantity: number,
    discrepancyNotes?: string,
    locationName?: string
  ): Promise<any> {
    if (!USE_MOCK) {
      return await apiClient.receiveTransfer(transferId, verifiedQuantity, discrepancyNotes, locationName);
    }

    const item = this.inboundItems.find(b => b.id === transferId);
    if (!item) throw new Error('Shipment transfer not found');
    item.received_quantity = verifiedQuantity;
    item.discrepancy = verifiedQuantity - item.expected_quantity;
    item.has_discrepancy = item.discrepancy !== 0;
    item.is_confirmed = true;
    item.discrepancy_notes = discrepancyNotes;
    item.status = item.discrepancy !== 0 ? 'DISCREPANCY_FLAGGED' : 'VERIFIED';
    return item;
  }

  async receiveTransfer(
    transferId: string,
    verifiedQuantity: number,
    discrepancyNotes?: string,
    locationName?: string
  ): Promise<any> {
    return this.receiveShipment(transferId, verifiedQuantity, discrepancyNotes, locationName);
  }

  async dispatchShipment(payload: {
    batch_id: string;
    to_organization_id: string;
    quantity: number;
    notes?: string;
    location_name?: string;
  }): Promise<any> {
    if (!USE_MOCK) {
      try {
        return await apiClient.dispatchTransfer(payload);
      } catch (err) {
        console.warn('Backend dispatchTransfer failed, using local simulation:', err);
      }
    }
    return {
      id: `trn_${Date.now()}`,
      ...payload,
      is_confirmed: false,
      timestamp: new Date().toISOString(),
    };
  }

  async getInventory(status?: string, search?: string): Promise<InventoryRecord[]> {
    if (!USE_MOCK) {
      try {
        return await apiClient.getInventoryRecords(status, search);
      } catch (err) {
        console.warn('Backend getInventoryRecords failed, using mock fallback:', err);
      }
    }
    return [
      {
        id: 'inv_mock_01',
        organization_id: 'org_apollo_logistics',
        batch_id: 'btc_b1001_paracet',
        batch_number: 'B1001',
        medicine_brand_name: 'Paracetamol 500mg IP',
        medicine_generic_name: 'Paracetamol',
        dosage_form: 'Tablet',
        expiry_date: '2026-10-30',
        batch_status: 'IN_DISTRIBUTION',
        quantity_received: 800,
        quantity_available: 800,
        quantity_quarantined: 0,
        updated_at: new Date().toISOString(),
      },
      {
        id: 'inv_mock_02',
        organization_id: 'org_apollo_logistics',
        batch_id: 'btc_amox_1002',
        batch_number: 'B1002',
        medicine_brand_name: 'Amoxil 500mg',
        medicine_generic_name: 'Amoxicillin',
        dosage_form: 'Capsule',
        expiry_date: '2027-04-01',
        batch_status: 'IN_DISTRIBUTION',
        quantity_received: 5000,
        quantity_available: 5000,
        quantity_quarantined: 0,
        updated_at: new Date().toISOString(),
      }
    ];
  }
}

export const inventoryService = new InventoryService();
export default inventoryService;
