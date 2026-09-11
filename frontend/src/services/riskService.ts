import { RiskScoreReport } from '../types/api';
import { demoState } from '../mocks/mockData';

class RiskService {
  async getBatchRiskScore(batchNumber: string): Promise<RiskScoreReport> {
    if (batchNumber === 'B1001') {
      const isReentry = demoState.reentryDetected || demoState.isB1001InDeadRegistry;
      return {
        batch_id: 'B1001',
        composite_risk_score: isReentry ? 0.98 : (demoState.b1001Status === 'EXPIRED' ? 0.85 : 0.08),
        risk_level: isReentry ? 'CRITICAL' : (demoState.b1001Status === 'EXPIRED' ? 'HIGH' : 'LOW'),
        expiry_risk_score: demoState.b1001Status === 'EXPIRED' ? 0.95 : 0.05,
        supply_chain_anomaly_score: isReentry ? 0.92 : 0.04,
        reentry_risk_score: isReentry ? 0.99 : 0.02,
        seller_reputation_score: isReentry ? 0.10 : 0.98,
        explanation_summary: isReentry 
          ? 'CRITICAL ALERT: Batch B1001 was certified destroyed at an authorized disposal site. Active commercial scan/listing signals direct diversion or illicit repackaging.'
          : (demoState.b1001Status === 'EXPIRED' 
              ? 'HIGH RISK: Product has exceeded expiration date. Auto-block enabled across pharmacy registers.' 
              : 'LOW RISK: Verified forward supply custody with unbroken digital handshakes.'),
        factor_breakdown: {
          expiry_proximity: demoState.b1001Status === 'EXPIRED' ? 'CRITICAL (Expired)' : 'HEALTHY (2+ years)',
          quantity_anomaly: 'NORMAL (1,000 / 1,000 units verified)',
          return_frequency: isReentry ? 'ABNORMAL (Re-entering after destruction)' : 'NORMAL',
          seller_activity: isReentry ? 'HIGH RISK (Unauthorized gray channel)' : 'VERIFIED (MedPlus Retail)',
          movement_trajectory: 'STANDARD (Mumbai -> Delhi -> Bengaluru)',
        },
        timestamp: new Date().toISOString(),
      };
    }

    return {
      batch_id: batchNumber,
      composite_risk_score: 0.87,
      risk_level: 'HIGH',
      expiry_risk_score: 0.78,
      supply_chain_anomaly_score: 0.85,
      reentry_risk_score: 0.60,
      seller_reputation_score: 0.45,
      explanation_summary: 'HIGH RISK: Discrepancies detected during reverse logistics transit combined with unverified seller offerings.',
      factor_breakdown: {
        expiry_proximity: 'APPROACHING (35 days remaining)',
        quantity_anomaly: 'FLAGGED (-20 units missing during transit)',
        return_frequency: 'ELEVATED (2 returns in 6 months)',
        seller_activity: 'UNDER REVIEW',
        movement_trajectory: 'UNUSUAL DIVERSION ROUTE',
      },
      timestamp: new Date().toISOString(),
    };
  }

  async getExpiryForecast(): Promise<any[]> {
    return [
      { range: '0-30 Days', units: 1420, risk: 'CRITICAL', batches: 6 },
      { range: '31-60 Days', units: 3850, risk: 'HIGH', batches: 14 },
      { range: '61-90 Days', units: 8200, risk: 'MEDIUM', batches: 29 },
      { range: '91-180 Days', units: 24500, risk: 'LOW', batches: 84 },
      { range: '180+ Days', units: 110000, risk: 'MINIMAL', batches: 310 },
    ];
  }
}

export const riskService = new RiskService();
export default riskService;
