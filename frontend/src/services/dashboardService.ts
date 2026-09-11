/**
 * Dashboard Service — connects to the real FastAPI /dashboard endpoints.
 * Falls back to mock values if real API is unreachable or in mock mode.
 */
import apiClient, { DashboardSummaryData } from './apiClient';
import { ManufacturerDashboardData } from '../types/api';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

export interface DashboardMetrics {
  activeBatches: number;
  nearExpiryBatches: number;
  expiredBatches: number;
  recalledBatches: number;
  inTransitReturns: number;
  awaitingDisposal: number;
  destroyedBatches: number;
  deadBatchesInRegistry: number;
  reentryViolationsPrevented: number;
  criticalAlertsUnread: number;
  complianceRate: number;
}

export class DashboardService {
  async getSummary(): Promise<DashboardMetrics> {
    if (!USE_MOCK) {
      try {
        const data = await apiClient.getDashboardSummary();
        return {
          activeBatches: data.active_batches,
          nearExpiryBatches: data.near_expiry_batches,
          expiredBatches: data.expired_batches,
          recalledBatches: data.recalled_batches,
          inTransitReturns: data.in_transit_returns,
          awaitingDisposal: data.awaiting_disposal,
          destroyedBatches: data.destroyed_batches,
          deadBatchesInRegistry: data.dead_batches_in_registry,
          reentryViolationsPrevented: data.reentry_violations_prevented,
          criticalAlertsUnread: data.critical_alerts_unread,
          complianceRate: data.compliance_rate,
        };
      } catch (err) {
        console.warn('Backend /dashboard/summary failed, falling back to mock data', err);
      }
    }

    // Default mock data
    return {
      activeBatches: 12480,
      nearExpiryBatches: 412,
      expiredBatches: 370,
      recalledBatches: 42,
      inTransitReturns: 184,
      awaitingDisposal: 28,
      destroyedBatches: 890,
      deadBatchesInRegistry: 890,
      reentryViolationsPrevented: 14,
      criticalAlertsUnread: 3,
      complianceRate: 98.6,
    };
  }

  async getExpiryTrend(): Promise<{ name: string; value: number }[]> {
    if (!USE_MOCK) {
      try {
        const trend = await apiClient.getExpiryTrend();
        if (trend && trend.length > 0) {
          return trend.map(t => ({ name: t.month, value: t.count }));
        }
      } catch (err) {
        console.warn('Backend /dashboard/expiry-trend failed, using mock', err);
      }
    }
    return [
      { name: 'Apr', value: 120 },
      { name: 'May', value: 190 },
      { name: 'Jun', value: 160 },
      { name: 'Jul', value: 240 },
      { name: 'Aug', value: 310 },
      { name: 'Sep', value: 380 },
    ];
  }

  async getReturnTrend(): Promise<{ name: string; value: number }[]> {
    if (!USE_MOCK) {
      try {
        const trend = await apiClient.getReturnTrend();
        if (trend && trend.length > 0) {
          return trend.map(t => ({ name: t.month, value: t.count }));
        }
      } catch (err) {
        console.warn('Backend /dashboard/return-trend failed, using mock', err);
      }
    }
    return [
      { name: 'Apr', value: 14 },
      { name: 'May', value: 28 },
      { name: 'Jun', value: 22 },
      { name: 'Jul', value: 35 },
      { name: 'Aug', value: 48 },
      { name: 'Sep', value: 62 },
    ];
  }

  async getManufacturerDashboard(): Promise<ManufacturerDashboardData> {
    if (!USE_MOCK) {
      try {
        const data = await apiClient.getManufacturerDashboard();
        if (data) return data;
      } catch (err) {
        console.warn('Backend /dashboard/manufacturer failed, using mock data:', err);
      }
    }

    return {
      total_batches: 12,
      active_batches: 8,
      near_expiry_batches: 2,
      expired_batches: 1,
      recalled_batches: 1,
      distributed_batches: 7,
      returned_batches: 1,
      destroyed_batches: 1,
      total_units_manufactured: 54000,
      total_units_in_inventory: 18500,
      recent_batches: [],
      recent_transfers: [],
      recent_returns: [],
      critical_alerts: [],
      status_distribution: {
        MANUFACTURED: 1,
        IN_DISTRIBUTION: 3,
        AT_PHARMACY: 5,
        RETURN_INITIATED: 1,
        DEAD_BATCH: 1,
        EXPIRED: 1,
      },
    };
  }

  async getDistributorDashboard(): Promise<any> {
    if (!USE_MOCK) {
      try {
        const data = await apiClient.getDistributorDashboard();
        if (data) return data;
      } catch (err) {
        console.warn('Backend /dashboard/distributor failed, using fallback:', err);
      }
    }
    return {
      total_received: 18500,
      total_inventory: 8200,
      pending_receiving: 2,
      pending_transfers: 1,
      discrepancies_count: 1,
      near_expiry_batches: 1,
      expired_batches: 0,
      critical_alerts_count: 1,
      incoming_shipments: [],
      recent_transfers: [],
      critical_alerts: [],
    };
  }

  async getPharmacyDashboard(): Promise<any> {
    if (!USE_MOCK) {
      try {
        const data = await apiClient.getPharmacyDashboard();
        if (data) return data;
      } catch (err) {
        console.warn('Backend /dashboard/pharmacy failed, using fallback:', err);
      }
    }
    return {
      active_stock: 18500,
      incoming_count: 1,
      near_expiry_count: 1,
      expired_count: 1,
      recalled_count: 0,
      blocked_count: 1,
      return_ready_count: 1,
      incoming_shipments: [],
      recent_scans: [],
      alerts: [],
    };
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;
