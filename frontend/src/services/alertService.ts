import { SystemAlert, MOCK_ALERTS } from '../mocks/mockData';
import apiClient from './apiClient';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

class AlertService {
  private alerts: SystemAlert[] = [...MOCK_ALERTS];

  async getAlerts(severity?: string): Promise<SystemAlert[]> {
    if (!USE_MOCK) {
      try {
        const sevParam = severity && severity !== 'ALL' ? severity : undefined;
        const apiAlerts = await apiClient.getAlerts(sevParam);
        if (apiAlerts && apiAlerts.length > 0) {
          return apiAlerts.map(a => ({
            id: a.id,
            type: a.severity as any,
            title: a.title,
            description: a.message,
            batchNumber: a.entity_type === 'BATCH' || a.entity_type === 'RETURN' ? a.entity_id : undefined,
            timestamp: a.created_at,
            isAcknowledged: a.is_read || a.is_resolved,
          }));
        }
      } catch (err) {
        console.warn('Backend /alerts failed, using mock data:', err);
      }
    }

    if (!severity || severity === 'ALL') {
      return [...this.alerts];
    }
    return this.alerts.filter(a => a.type === severity);
  }

  async acknowledgeAlert(id: string): Promise<SystemAlert> {
    if (!USE_MOCK) {
      try {
        await apiClient.markAlertRead(id);
      } catch (err) {
        console.warn(`Backend markAlertRead(${id}) failed, local mock used:`, err);
      }
    }

    const alert = this.alerts.find(a => a.id === id);
    if (!alert) {
      return {
        id,
        type: 'HIGH',
        title: 'Acknowledged Alert',
        description: 'Acknowledged',
        timestamp: new Date().toISOString(),
        isAcknowledged: true,
      };
    }
    alert.isAcknowledged = true;
    return alert;
  }
}

export const alertService = new AlertService();
export default alertService;
