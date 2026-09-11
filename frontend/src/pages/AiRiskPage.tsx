import React, { useState, useEffect } from 'react';
import { 
  Cpu, AlertTriangle, ShieldCheck, Activity, 
  BarChart3, Brain, ArrowRight, HelpCircle, 
  Sliders, Play, RefreshCw, Zap, ShieldAlert, 
  Gauge, TrendingUp, AlertOctagon, Flame, Lock, 
  Compass, CheckCircle2, ChevronRight, Info
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import MetricCard from '../components/ui/MetricCard';
import StatusBadge from '../components/ui/StatusBadge';
import apiClient from '../services/apiClient';
import { 
  BatchRiskEvaluation, IntelligenceSummary, AnomalyItem, 
  BatchSimulationRequest, RiskLevel 
} from '../types/api';

export const AiRiskPage: React.FC = () => {
  // Main State
  const [evaluation, setEvaluation] = useState<BatchRiskEvaluation | null>(null);
  const [summary, setSummary] = useState<IntelligenceSummary | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [targetBatch, setTargetBatch] = useState<string>('AMX-2026-001');
  const [loading, setLoading] = useState<boolean>(true);
  const [simulating, setSimulating] = useState<boolean>(false);

  // Simulation Form State
  const [simDaysToExpiry, setSimDaysToExpiry] = useState<number>(180);
  const [simSpeedKmh, setSimSpeedKmh] = useState<number>(65);
  const [simShrinkage, setSimShrinkage] = useState<number>(0);
  const [simDiscount, setSimDiscount] = useState<number>(0);
  const [simDarknet, setSimDarknet] = useState<boolean>(false);
  const [simDeadBatch, setSimDeadBatch] = useState<boolean>(false);

  // Fetch live summary, batch evaluation, and anomalies
  const loadData = async (batchNum: string) => {
    setLoading(true);
    try {
      const [evalRes, sumRes, anomRes] = await Promise.all([
        apiClient.evaluateBatchRisk(batchNum).catch(() => null),
        apiClient.getIntelligenceSummary().catch(() => null),
        apiClient.getAnomalies().catch(() => []),
      ]);
      if (evalRes) setEvaluation(evalRes);
      if (sumRes) setSummary(sumRes);
      if (anomRes) setAnomalies(anomRes);
    } catch (err) {
      console.error('Failed to load AI risk intelligence:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(targetBatch);
  }, [targetBatch]);

  // Handle Run Simulation
  const handleRunSimulation = async () => {
    setSimulating(true);
    try {
      const req: BatchSimulationRequest = {
        batch_number: `SIM-${targetBatch}`,
        days_to_expiry: simDaysToExpiry,
        transit_speed_kmh: simSpeedKmh,
        shrinkage_quantity: simShrinkage,
        marketplace_discount_percent: simDiscount,
        illicit_marketplace_listing: simDarknet,
        is_dead_batch_simulated: simDeadBatch,
      };
      const simResult = await apiClient.simulateBatchRisk(req);
      setEvaluation(simResult);
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  // Reset to live batch data
  const handleResetToLive = () => {
    setSimDaysToExpiry(180);
    setSimSpeedKmh(65);
    setSimShrinkage(0);
    setSimDiscount(0);
    setSimDarknet(false);
    setSimDeadBatch(false);
    loadData(targetBatch);
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.75) return 'text-rose-400';
    if (score >= 0.40) return 'text-amber-400';
    return 'text-emerald-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 0.75) return 'border-rose-500/50 bg-rose-950/20 shadow-[0_0_25px_rgba(244,63,94,0.15)]';
    if (score >= 0.40) return 'border-amber-500/40 bg-amber-950/20 shadow-[0_0_25px_rgba(245,158,11,0.12)]';
    return 'border-emerald-500/40 bg-emerald-950/20 shadow-[0_0_25px_rgba(16,185,129,0.12)]';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <PageHeader
        title="AI Supply Chain Risk Intelligence & Neural Anomaly Scorer"
        description="Multi-model ensemble synthesizing transit speed anomalies, quantity leakage, shelf-life decay, re-entry threats, and gray-market surveillance"
        badge={
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-purple-950/60 border border-purple-500/40 text-purple-300">
            <Brain className="w-3.5 h-3.5 text-purple-400" />
            Ensemble AI Engine v2.1
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(targetBatch)}
              disabled={loading}
              className="p-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Refresh AI Telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        }
      />

      {/* Critical Deterministic Guard Banner */}
      <div className="glass-panel p-3.5 rounded-xl border border-cyan-500/40 bg-cyan-950/20 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-slate-300">
            <strong className="text-white">Deterministic Safety Shield Active:</strong> AI predictions serve exclusively as decision support. Sovereign hard rules (EXPIRED, RECALLED, DESTROYED, DEAD_BATCH) remain permanently inviolable.
          </span>
        </div>
        <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-900/60 text-cyan-300 border border-cyan-700/50 uppercase shrink-0">
          Guardrail Invariant
        </span>
      </div>

      {/* Top 6 KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          title="Monitored Lots"
          value={summary?.total_batches_monitored ?? 5}
          subtext="Under active neural surveillance"
          accentColor="cyan"
          icon={<Cpu className="w-4 h-4" />}
        />
        <MetricCard
          title="High-Risk Lots"
          value={summary?.high_risk_lots_count ?? 1}
          subtext="Score ≥ 0.75 or flagged"
          accentColor="rose"
          icon={<AlertTriangle className="w-4 h-4" />}
        />
        <MetricCard
          title="Active Anomalies"
          value={summary?.anomalies_active_count ?? anomalies.length}
          subtext="Velocity, leakage & dwell"
          accentColor="amber"
          icon={<Activity className="w-4 h-4" />}
        />
        <MetricCard
          title="Re-Entry Threats"
          value={summary?.reentry_threats_count ?? 1}
          subtext="Dead batch registry matches"
          accentColor="purple"
          icon={<Flame className="w-4 h-4" />}
        />
        <MetricCard
          title="Fleet Risk Index"
          value={summary ? `${Math.round(summary.average_system_risk_score * 100)}/100` : '22/100'}
          subtext="System-wide composite mean"
          accentColor="blue"
          icon={<Gauge className="w-4 h-4" />}
        />
        <MetricCard
          title="AI Model"
          value="v2.1"
          subtext="Multi-model ensemble"
          accentColor="emerald"
          icon={<Brain className="w-4 h-4" />}
        />
      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Composite Score & Batch Selection (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className={`glass-panel p-6 rounded-2xl border flex flex-col items-center justify-center text-center transition-all ${getScoreBg(evaluation?.composite_risk_score ?? 0)}`}>
            <div className="flex items-center gap-2 mb-4 w-full justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                Composite Risk Index
              </span>
              <select
                value={targetBatch}
                onChange={e => setTargetBatch(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-cyan-300 text-xs font-mono font-bold rounded-lg px-2.5 py-1 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="AMX-2026-001">AMX-2026-001 (Active Shelf)</option>
                <option value="B1001">B1001 (Paracetamol)</option>
                <option value="AMX-2024-DEAD-01">AMX-2024-DEAD-01 (Dead Batch)</option>
                <option value="RMD-2026-REC">RMD-2026-REC (Recalled)</option>
                <option value="AZT-2025-EXP">AZT-2025-EXP (Expired)</option>
              </select>
            </div>

            {/* Circular Gauge */}
            <div className="relative w-44 h-44 rounded-full border-4 border-slate-800/80 flex flex-col items-center justify-center my-3 shadow-2xl bg-slate-950/70">
              <span className={`text-5xl font-black font-mono tracking-tighter ${getScoreColor(evaluation?.composite_risk_score ?? 0)}`}>
                {evaluation ? Math.round(evaluation.composite_risk_score * 100) : 15}
              </span>
              <span className="text-xs font-mono uppercase tracking-widest text-slate-400 mt-1">/ 100</span>
            </div>

            {/* Risk Level Badge */}
            <div className="mt-2">
              <StatusBadge status={evaluation?.risk_level || 'LOW'} size="lg" />
            </div>

            {/* Plain English Explanation */}
            <p className="text-xs text-slate-300 mt-4 leading-relaxed max-w-xs font-medium">
              {evaluation?.explanation_summary || 'Evaluating supply chain integrity across all telemetry channels...'}
            </p>

            {/* Batch Reference Footer */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 w-full flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Lot: <strong className="text-cyan-400">{evaluation?.batch_number || targetBatch}</strong></span>
              <span>Model: <strong className="text-purple-400">{evaluation?.model_version || 'v2.1'}</strong></span>
            </div>
          </div>

          {/* Plain English Rationales List */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2.5">
            <h4 className="text-xs font-mono font-semibold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span>Attribution Reasoning</span>
            </h4>
            <div className="space-y-1.5 text-xs text-slate-300">
              {evaluation?.reasons.map((reason, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 leading-relaxed flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Middle Column: Explainable Attribution Vectors (5 cols) */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Brain className="w-4 h-4 text-cyan-400" />
                <span>Explainable Attribution Vectors</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">SHAP-inspired feature weight contributions to risk index</p>
            </div>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
              Normalized Weights
            </span>
          </div>

          {/* 5 Attribution Vectors */}
          <div className="space-y-4">
            {/* 1. Expiry Degradation */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span>1. Expiry Degradation Velocity</span>
                </span>
                <span className="font-mono font-bold text-cyan-400">
                  {Math.round((evaluation?.expiry_risk_score ?? 0.1) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(5, Math.round((evaluation?.expiry_risk_score ?? 0.1) * 100)))}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-400 block">
                Days until expiration vs channel distribution dwell time
              </span>
            </div>

            {/* 2. Transit Velocity & Speed Anomaly */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span>2. Transit Velocity & Spatial Integrity</span>
                </span>
                <span className="font-mono font-bold text-cyan-400">
                  {Math.round((evaluation?.movement_anomaly_score ?? 0.05) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-rose-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(5, Math.round((evaluation?.movement_anomaly_score ?? 0.05) * 100)))}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-400 block">
                Evaluates physical transfer speed (&gt;140 km/h indicates spoofing)
              </span>
            </div>

            {/* 3. Quantity Leakage / Discrepancy */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span>3. Quantity Variance & Reconciliation</span>
                </span>
                <span className="font-mono font-bold text-cyan-400">
                  {Math.round((evaluation?.quantity_anomaly_score ?? 0.05) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-rose-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(5, Math.round((evaluation?.quantity_anomaly_score ?? 0.05) * 100)))}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-400 block">
                Tracks missing units and tare weight shrinkage between transfer handoffs
              </span>
            </div>

            {/* 4. Re-Entry Threat */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span>4. Re-Entry & Decommissioned Threat</span>
                </span>
                <span className="font-mono font-bold text-cyan-400">
                  {Math.round((evaluation?.reentry_risk_score ?? 0.05) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-600 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(5, Math.round((evaluation?.reentry_risk_score ?? 0.05) * 100)))}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-400 block">
                Checks Dead Batch Registry inscription, reverse return states, and recall directives
              </span>
            </div>

            {/* 5. Marketplace Surveillance */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span>5. Gray Market & Online Surveillance</span>
                </span>
                <span className="font-mono font-bold text-cyan-400">
                  {Math.round((evaluation?.seller_listing_risk_score ?? 0.05) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(5, Math.round((evaluation?.seller_listing_risk_score ?? 0.05) * 100)))}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-400 block">
                Monitors deep e-commerce discounts (&gt;50%) and unverified channel listings
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Scenario Stress-Tester (3 cols) */}
        <div className="lg:col-span-3 glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="border-b border-slate-800 pb-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Scenario Stress-Tester</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Simulate supply disruptions & test neural response</p>
          </div>

          <div className="space-y-3.5 text-xs text-slate-300">
            {/* Days to Expiry */}
            <div>
              <div className="flex justify-between mb-1 text-[11px]">
                <label className="text-slate-400 font-medium">Days to Expiration</label>
                <span className="font-mono text-cyan-400 font-bold">{simDaysToExpiry}d</span>
              </div>
              <input
                type="range"
                min="0"
                max="600"
                step="10"
                value={simDaysToExpiry}
                onChange={e => setSimDaysToExpiry(parseInt(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Transit Speed */}
            <div>
              <div className="flex justify-between mb-1 text-[11px]">
                <label className="text-slate-400 font-medium">Transit Speed (km/h)</label>
                <span className={`font-mono font-bold ${simSpeedKmh > 140 ? 'text-rose-400' : 'text-cyan-400'}`}>
                  {simSpeedKmh} km/h {simSpeedKmh > 140 && '(VIOLATION)'}
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="250"
                step="5"
                value={simSpeedKmh}
                onChange={e => setSimSpeedKmh(parseInt(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Quantity Shrinkage */}
            <div>
              <div className="flex justify-between mb-1 text-[11px]">
                <label className="text-slate-400 font-medium">Shrinkage (Units Missing)</label>
                <span className={`font-mono font-bold ${simShrinkage > 50 ? 'text-rose-400' : 'text-cyan-400'}`}>
                  {simShrinkage} units
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="400"
                step="10"
                value={simShrinkage}
                onChange={e => setSimShrinkage(parseInt(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Marketplace Discount */}
            <div>
              <div className="flex justify-between mb-1 text-[11px]">
                <label className="text-slate-400 font-medium">Marketplace Discount (%)</label>
                <span className={`font-mono font-bold ${simDiscount > 50 ? 'text-amber-400' : 'text-cyan-400'}`}>
                  {simDiscount}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                step="5"
                value={simDiscount}
                onChange={e => setSimDiscount(parseInt(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Darknet Toggle */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="text-[11px] font-medium text-slate-300">Darknet / Telegram Listing</span>
              <input
                type="checkbox"
                checked={simDarknet}
                onChange={e => setSimDarknet(e.target.checked)}
                className="accent-rose-500 w-4 h-4 cursor-pointer"
              />
            </div>

            {/* Dead Batch Toggle */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="text-[11px] font-medium text-slate-300">Dead Registry Inscription</span>
              <input
                type="checkbox"
                checked={simDeadBatch}
                onChange={e => setSimDeadBatch(e.target.checked)}
                className="accent-red-600 w-4 h-4 cursor-pointer"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleRunSimulation}
                disabled={simulating}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>{simulating ? 'Simulating...' : 'Run Neural Stress-Test'}</span>
              </button>

              <button
                type="button"
                onClick={handleResetToLive}
                className="w-full py-1.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-medium text-xs transition-colors cursor-pointer"
              >
                Reset to Live Telemetry
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Supply Chain Anomalies Dossier */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-400" />
              <span>Real-Time Supply Chain Anomaly Feed</span>
            </h3>
            <p className="text-xs text-slate-400">Algorithmic flags detected across velocity, quantity balance, and reverse handoffs</p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {anomalies.length} Flagged Incidents
          </span>
        </div>

        {anomalies.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/60 mx-auto mb-2" />
            <span>No supply chain anomalies active. Forward and reverse custody networks intact.</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {anomalies.map((anom, idx) => (
              <div
                key={anom.id || idx}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={anom.severity} size="sm" />
                    <strong className="text-white font-mono">{anom.anomaly_type}</strong>
                    <span className="text-slate-500 font-mono text-[11px]">Batch: {anom.batch_id}</span>
                  </div>
                  <p className="text-slate-300 text-xs">{anom.description}</p>
                </div>
                <div className="text-right text-[11px] text-slate-500 font-mono shrink-0">
                  {new Date(anom.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AiRiskPage;
