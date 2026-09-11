import { AuditEvent, MOCK_AUDIT_TRAIL, MOCK_COMPLIANCE_SUMMARY } from '../mocks/mockData';
import { ComplianceSummary } from '../types/api';
import apiClient from './apiClient';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

class AuditService {
  private events: AuditEvent[] = [...MOCK_AUDIT_TRAIL];

  async getAuditEvents(entityFilter?: string): Promise<AuditEvent[]> {
    if (!USE_MOCK) {
      try {
        const logs = await apiClient.getAuditLogs(100);
        if (logs && logs.length > 0) {
          const mapped: AuditEvent[] = logs.map(l => ({
            id: l.id,
            timestamp: l.timestamp,
            user: l.actor_user_id || 'System Process',
            role: l.actor_role || 'SYSTEM',
            organization: 'PharmaSafe Network',
            action: l.action,
            entity: l.entity_type,
            entityId: l.entity_id || '',
            result: l.action.includes('BLOCK') || l.action.includes('REENTRY') ? 'CRITICAL_BLOCK' : 'SUCCESS',
            details: l.details || '',
          }));

          if (!entityFilter || entityFilter === 'ALL') {
            return mapped;
          }
          return mapped.filter(e => e.entity === entityFilter);
        }
      } catch (err) {
        console.warn('Backend /audit/logs failed, using mock data:', err);
      }
    }

    if (!entityFilter || entityFilter === 'ALL') {
      return [...this.events];
    }
    return this.events.filter(e => e.entity === entityFilter);
  }

  async getComplianceSummary(): Promise<ComplianceSummary> {
    if (!USE_MOCK) {
      try {
        return await apiClient.getComplianceSummary();
      } catch (err) {
        console.warn('Backend /audit/compliance/summary failed, using mock:', err);
      }
    }
    return { ...MOCK_COMPLIANCE_SUMMARY };
  }
}

export const auditService = new AuditService();
export default auditService;
