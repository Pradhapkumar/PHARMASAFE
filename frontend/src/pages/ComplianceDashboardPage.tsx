import React from 'react';
import { 
  CheckSquare, Activity, ShieldAlert, Award, 
  Building2, MapPin, AlertTriangle, ArrowRight 
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import MetricCard from '../components/ui/MetricCard';
import { MOCK_COMPLIANCE_SUMMARY } from '../mocks/mockData';

export const ComplianceDashboardPage: React.FC = () => {
  const regions = [
    { name: 'Maharashtra (Zone 1)', score: 99.2, batches: 4800, openAudits: 0, status: 'EXEMPLARY' },
    { name: 'Karnataka (Zone 2)', score: 98.8, batches: 3400, openAudits: 1, status: 'COMPLIANT' },
    { name: 'Delhi NCR (Zone 3)', score: 97.4, batches: 2900, openAudits: 2, status: 'WATCHLIST' },
    { name: 'Telangana (Zone 4)', score: 98.9, batches: 1380, openAudits: 0, status: 'COMPLIANT' },
  ];

  const orgScores = [
    { name: 'Pfizer Healthcare India Ltd.', role: 'Manufacturer', score: 99.6, rating: 'GRADE A+' },
    { name: 'Sun Pharma Industries Ltd.', role: 'Manufacturer', score: 99.1, rating: 'GRADE A' },
    { name: 'GreenShield Incineration Facility', role: 'Disposal Facility', score: 98.9, rating: 'GRADE A' },
    { name: 'MedPlus Retail Pharmacy Chain', role: 'Pharmacy', score: 98.5, rating: 'GRADE A' },
    { name: 'Apollo National Logistics Hub', role: 'Distributor', score: 96.8, rating: 'GRADE B (Discrepancy Audit)' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="National Regulatory Compliance & Drug Disposal Mandate Portal"
        description="CDSCO Regulatory Oversight Console monitoring compliance against statutory pharmaceutical reverse disposal mandates"
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
            CDSCO Central Inspectorate
          </span>
        }
      />

      {/* Top Compliance KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Mandate Compliance Rate"
          value="98.4%"
          subtext="Target: 98.0% minimum threshold"
          trend="up"
          change="+0.8%"
          accentColor="emerald"
        />
        <MetricCard
          title="Return Completion Rate"
          value="96.8%"
          subtext="Expired lots retrieved & neutralized"
          trend="up"
          change="+1.4%"
          accentColor="cyan"
        />
        <MetricCard
          title="Destruction Verification Rate"
          value="99.9%"
          subtext="SHA-256 dual witness certification"
          trend="up"
          accentColor="purple"
        />
        <MetricCard
          title="Re-Entry Interceptions"
          value="14 Prevented"
          subtext="Critical market violations blocked"
          accentColor="rose"
        />
      </div>

      {/* Regional Compliance & Audits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regional Comparison */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span>State Regulatory Jurisdictions</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4">Real-time compliance index by state drug control directorate</p>

          <div className="space-y-3">
            {regions.map((reg, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4 text-xs font-mono"
              >
                <div>
                  <strong className="text-white text-xs block font-sans">{reg.name}</strong>
                  <span className="text-slate-400 text-[11px]">{reg.batches.toLocaleString()} Lots Monitored</span>
                </div>

                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] block">Audits</span>
                    <strong className="text-slate-300">{reg.openAudits} Open</strong>
                  </div>

                  <div className="text-right">
                    <span className="text-emerald-400 font-bold block">{reg.score}%</span>
                    <span className="text-[10px] text-slate-500">{reg.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Licensed Organization Integrity Ranking */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-cyan-400" />
            <span>Supply Chain Entity Integrity Index</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4">Mandate compliance scorecard for authorized chain partners</p>

          <div className="space-y-3">
            {orgScores.map((org, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4 text-xs"
              >
                <div>
                  <strong className="text-white text-xs block">{org.name}</strong>
                  <span className="text-slate-400 text-[11px] font-mono">{org.role}</span>
                </div>

                <div className="text-right font-mono">
                  <strong className="text-white block">{org.score}%</strong>
                  <span className={`text-[10px] font-bold ${
                    org.rating.includes('A') ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {org.rating}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplianceDashboardPage;
