import { ReturnRequest } from '../types/api';
import { MOCK_RETURNS, demoState } from '../mocks/mockData';
import apiClient from './apiClient';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

class ReturnService {
  private returns: ReturnRequest[] = [...MOCK_RETURNS];

  async getReturns(): Promise<ReturnRequest[]> {
    if (!USE_MOCK) {
      try {
        const apiReturns = await apiClient.getReturnRequests();
        if (Array.isArray(apiReturns)) {
          return apiReturns;
        }
      } catch (err) {
        console.warn('Backend /returns request failed, using mock data:', err);
      }
    }
    return [...this.returns];
  }

  async getReturnById(id: string): Promise<ReturnRequest | undefined> {
    if (!USE_MOCK) {
      try {
        return await apiClient.getReturnById(id);
      } catch (err) {
        console.warn(`Backend /returns/${id} failed, checking local mock:`, err);
      }
    }
    return this.returns.find(r => r.id === id || r.tracking_code === id);
  }

  async createReturn(data: {
    batch_id: string;
    quantity: number;
    reason: any;
    destination_facility_id: string;
    notes?: string;
    carrier_name?: string;
    carrier_tracking_ref?: string;
    driver_badge?: string;
  }): Promise<ReturnRequest> {
    if (!USE_MOCK) {
      const created = await apiClient.createReturnRequest(
        data.batch_id,
        data.destination_facility_id,
        data.quantity,
        data.reason,
        data.notes,
        data.carrier_name,
        data.carrier_tracking_ref,
        data.driver_badge
      );
      if (data.batch_id === 'btc_b1001' || data.batch_id === 'B1001') {
        demoState.isB1001Returned = true;
        demoState.b1001Status = 'RETURN_INITIATED';
      }
      return created;
    }

    const newReturn: ReturnRequest = {
      id: `ret_${Date.now()}`,
      batch_id: data.batch_id,
      initiator_org_id: 'org_medplus_retail',
      destination_facility_id: data.destination_facility_id,
      quantity: data.quantity,
      reason: data.reason,
      status: 'INITIATED',
      tracking_code: `TRK-REV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      manifest_hash: 'sha256:generated_' + Math.random().toString(36).substring(2, 15),
      notes: data.notes,
      carrier_name: data.carrier_name,
      carrier_tracking_ref: data.carrier_tracking_ref,
      driver_badge: data.driver_badge,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.returns.unshift(newReturn);

    if (data.batch_id === 'btc_b1001' || data.batch_id === 'B1001') {
      demoState.isB1001Returned = true;
      demoState.b1001Status = 'RETURN_INITIATED';
    }

    return newReturn;
  }

  async updateReturnStatus(
    id: string,
    status: any,
    notes?: string,
    receivedQuantity?: number,
    scaleWeightKg?: string,
    carrierName?: string,
    carrierTrackingRef?: string,
    driverBadge?: string
  ): Promise<ReturnRequest> {
    if (!USE_MOCK) {
      try {
        const updated = await apiClient.updateReturnStatus(
          id,
          status,
          undefined,
          notes,
          receivedQuantity,
          scaleWeightKg,
          carrierName,
          carrierTrackingRef,
          driverBadge
        );
        if (updated.batch_id === 'btc_b1001' || updated.batch_id === 'B1001') {
          if (status === 'IN_TRANSIT') demoState.b1001Status = 'RETURN_IN_TRANSIT';
          if (status === 'RECEIVED_AT_DISPOSAL' || status === 'RECEIVED_AT_FACILITY') demoState.b1001Status = 'RECEIVED_AT_DISPOSAL';
        }
        return updated;
      } catch (err) {
        console.warn('Backend updateReturnStatus failed, using local mock:', err);
      }
    }

    const ret = this.returns.find(r => r.id === id);
    if (!ret) throw new Error('Return not found');
    ret.status = status;
    if (receivedQuantity !== undefined) ret.received_quantity = receivedQuantity;
    if (scaleWeightKg) ret.scale_weight_kg = scaleWeightKg;
    if (carrierName) ret.carrier_name = carrierName;
    if (carrierTrackingRef) ret.carrier_tracking_ref = carrierTrackingRef;
    if (driverBadge) ret.driver_badge = driverBadge;
    ret.updated_at = new Date().toISOString();

    if (ret.batch_id === 'btc_b1001' || ret.batch_id === 'B1001') {
      if (status === 'IN_TRANSIT') demoState.b1001Status = 'RETURN_IN_TRANSIT';
      if (status === 'RECEIVED_AT_DISPOSAL' || status === 'RECEIVED_AT_FACILITY') demoState.b1001Status = 'RECEIVED_AT_DISPOSAL';
    }

    return ret;
  }

  async routeReturnToDisposal(
    id: string,
    disposalFacilityId: string,
    carrierName?: string,
    carrierTrackingRef?: string,
    driverBadge?: string,
    notes?: string
  ): Promise<ReturnRequest> {
    if (!USE_MOCK) {
      try {
        return await apiClient.routeReturnToDisposal(id, disposalFacilityId, carrierName, carrierTrackingRef, driverBadge, notes);
      } catch (err) {
        console.warn('Backend routeReturnToDisposal failed, using local mock:', err);
      }
    }
    const ret = this.returns.find(r => r.id === id);
    if (!ret) throw new Error('Return not found');
    ret.destination_facility_id = disposalFacilityId;
    ret.status = 'ROUTED_TO_DISPOSAL';
    if (carrierName) ret.carrier_name = carrierName;
    if (carrierTrackingRef) ret.carrier_tracking_ref = carrierTrackingRef;
    if (driverBadge) ret.driver_badge = driverBadge;
    ret.updated_at = new Date().toISOString();
    return ret;
  }
}

export const returnService = new ReturnService();
export default returnService;
