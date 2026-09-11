import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, ShieldCheck, AlertOctagon, RotateCcw, 
  Flame, Skull, Globe, Cpu, RefreshCw, Layers, MapPin, CheckCircle2,
  Calendar, ArrowUpRight, ArrowDownRight, Scale, ShieldAlert
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, Tooltip, Legend, CartesianGrid, AreaChart, Area 
} from 'recharts';
import { apiClient } from '../services/apiClient';
import { 
  AnalyticsOverview, ForwardSupplyAnalytics, ReverseLogisticsAnalytics, 
  DisposalThroughputAnalytics, DestructionAnalytics, OnlineMarketplaceAnalytics, 
  AIRiskAnalytics, ComplianceAnalytics, GeospatialTelemetryPoint 
} from '../types/api';

const COLORS = ['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'forward' | 'reverse' | 'disposal' | 'destruction' | 'online' | 'airisk' | 'compliance'>('overview');
  const [dateRange, setDateRange] = useState('30D');
  const [loading, setLoading] = useState(true);

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [forward, setForward] = useState<ForwardSupplyAnalytics | null>(null);
  const [reverse, setReverse] = useState<ReverseLogisticsAnalytics | null>(null);
  const [disposal, setDisposal] = useState<DisposalThroughputAnalytics | null>(null);
  const [destruction, setDestruction] = useState<DestructionAnalytics | null>(null);
  const [online, setOnline] = useState<OnlineMarketplaceAnalytics | null>(null);
  const [aiRisk, setAiRisk] = useState<AIRiskAnalytics | null>(null);
  const [compliance, setCompliance] = useState<ComplianceAnalytics | null>(null);
  const [telemetry, setTelemetry] = useState<GeospatialTelemetryPoint[]>([]);

  useEffect(() => {
    loadAllAnalytics();
  }, [dateRange]);

  const loadAllAnalytics = async () => {
    setLoading(true);
    try {
      const [
        ovData, fwdData, revData, dispData, 
        destData, onlData, aiData, compData, telemData
      ] = await Promise.all([
        apiClient.getAnalyticsOverview(),
        apiClient.getForwardSupplyAnalytics(),
        apiClient.getReverseLogisticsAnalytics(),
        apiClient.getDisposalThroughputAnalytics(),
        apiClient.getDestructionAnalytics(),
        apiClient.getOnlineMarketplaceAnalytics(),
        apiClient.getAIRiskAnalytics(),
        apiClient.getComplianceAnalytics(),
        apiClient.getGeospatialTelemetry()
      ]);

      setOverview(ovData);
      setForward(fwdData);
      setReverse(revData);
      setDisposal(dispData);
      setDestruction(destData);
      setOnline(onlData);
      setAiRisk(aiData);
      setCompliance(compData);
      setTelemetry(telemData);
    } catch (err) {
      console.error('Failed to load analytics suite:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
            <BarChart3 className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">Executive & Forensic Analytics</h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Phase 11
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              Closed-loop throughput, discrepancy rates, destruction audits, and 8-point regulatory index
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            {['7D', '30D', '90D', '1Y'].map(r => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1 rounded font-medium transition-all ${
                  dateRange === r ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            onClick={loadAllAnalytics}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Refresh Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Global KPI Strip */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Total Batches</div>
            <div className="text-xl font-bold text-white mt-1">{overview.total_batches}</div>
            <div className="text-[11px] text-emerald-400 mt-0.5">{overview.active_batches} active in fleet</div>
          </div>

          <div className="p-4 bg-slate-900/60 border border-amber-900/30 rounded-xl">
            <div className="text-[10px] uppercase font-semibold text-amber-400 tracking-wider">Active Returns</div>
            <div className="text-xl font-bold text-amber-300 mt-1">{overview.active_returns}</div>
            <div className="text-[11px] text-amber-500/80 mt-0.5">Reverse logistics pipeline</div>
          </div>

          <div className="p-4 bg-slate-900/60 border border-rose-900/30 rounded-xl">
            <div className="text-[10px] uppercase font-semibold text-rose-400 tracking-wider">Dead Batch Registry</div>
            <div className="text-xl font-bold text-rose-300 mt-1">{overview.dead_registry_count}</div>
            <div className="text-[11px] text-rose-500/80 mt-0.5">{overview.blocked_sales} POS blocks enforced</div>
          </div>

          <div className="p-4 bg-slate-900/60 border border-cyan-900/30 rounded-xl">
            <div className="text-[10px] uppercase font-semibold text-cyan-400 tracking-wider">Marketplace Safety</div>
            <div className="text-xl font-bold text-cyan-300 mt-1">{overview.online_takedowns}</div>
            <div className="text-[11px] text-cyan-500/80 mt-0.5">Takedowns issued</div>
          </div>

          <div className="p-4 bg-slate-900/60 border border-purple-900/30 rounded-xl">
            <div className="text-[10px] uppercase font-semibold text-purple-400 tracking-wider">Open Cases</div>
            <div className="text-xl font-bold text-purple-300 mt-1">{overview.open_investigations}</div>
            <div className="text-[11px] text-purple-400/80 mt-0.5">{overview.evidence_items_count} SHA-256 artifacts</div>
          </div>

          <div className="p-4 bg-slate-900/60 border border-emerald-900/30 rounded-xl">
            <div className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider">Compliance Index</div>
            <div className="text-xl font-bold text-emerald-300 mt-1">{overview.system_compliance_score}%</div>
            <div className="text-[11px] text-emerald-500/80 mt-0.5">Fleet risk index: {overview.fleet_risk_index}</div>
          </div>
        </div>
      )}

      {/* Dimensional Tab Navigation */}
      <div className="flex items-center gap-1 bg-slate-950 p-1.5 border border-slate-800 rounded-xl overflow-x-auto text-xs">
        {[
          { key: 'overview', label: 'Overview', icon: <BarChart3 className="w-3.5 h-3.5" /> },
          { key: 'forward', label: 'Forward Supply', icon: <Layers className="w-3.5 h-3.5" /> },
          { key: 'reverse', label: 'Reverse Logistics', icon: <RotateCcw className="w-3.5 h-3.5" /> },
          { key: 'disposal', label: 'Disposal Throughput', icon: <Flame className="w-3.5 h-3.5" /> },
          { key: 'destruction', label: 'Destruction & Dead Registry', icon: <Skull className="w-3.5 h-3.5" /> },
          { key: 'online', label: 'Online Surveillance', icon: <Globe className="w-3.5 h-3.5" /> },
          { key: 'airisk', label: 'AI Risk Trends', icon: <Cpu className="w-3.5 h-3.5" /> },
          { key: 'compliance', label: '8-Point Compliance Index', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.key 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {loading ? (
        <div className="p-16 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-400" />
          <p>Collating live supply chain intelligence...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && overview && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Closed-Loop Batch Lifecycle Distribution</span>
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Active at Pharmacy', value: overview.active_batches },
                          { name: 'Quarantined / Return', value: overview.active_returns },
                          { name: 'Permanently Destroyed', value: overview.dead_registry_count },
                          { name: 'Investigated / Flagged', value: overview.open_investigations }
                        ]}
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  <span>Recorded Location Telemetry Nodes</span>
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {telemetry.map((t, idx) => (
                    <div key={idx} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-200">{t.location_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Lat: {t.latitude.toFixed(4)}, Lon: {t.longitude.toFixed(4)}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                          {t.status}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-1">{new Date(t.timestamp).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FORWARD SUPPLY CHAIN */}
          {activeTab === 'forward' && forward && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white">Custody Transfers by Supply Chain Stage</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={forward.stage_distribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="stage" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white">Transferred Volume by Organization</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={forward.organization_activity} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" stroke="#94a3b8" />
                      <YAxis dataKey="org" type="category" stroke="#94a3b8" tick={{ fontSize: 10 }} width={120} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REVERSE LOGISTICS */}
          {activeTab === 'reverse' && reverse && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Reverse Return Reasons</h3>
                  <span className="text-xs font-mono text-amber-400 font-bold">
                    Discrepancy Rate: {reverse.discrepancy_rate}%
                  </span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reverse.reason_distribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="reason" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white">Reverse Pipeline Status Distribution</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reverse.status_pipeline}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {reverse.status_pipeline.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DISPOSAL THROUGHPUT */}
          {activeTab === 'disposal' && disposal && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white">Disposal Methods Throughput (Units)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={disposal.method_distribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="method" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white">Facility Capacity & Scale Weight</h3>
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Total Scale Weight Certified:</span>
                    <span className="font-mono text-white font-bold">{disposal.total_scale_weight_kg} kg</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Total Operational Disposals:</span>
                    <span className="font-mono text-white font-bold">{disposal.total_disposals} batches</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Total Disposed Units:</span>
                    <span className="font-mono text-rose-400 font-bold">{disposal.disposed_units.toLocaleString()} units</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DESTRUCTION & DEAD REGISTRY */}
          {activeTab === 'destruction' && destruction && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white">Monthly Destruction & Certificate Verification</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={destruction.monthly_destruction_trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Area type="monotone" dataKey="units" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white">Destruction Status Breakdown</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={destruction.status_distribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="status" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: ONLINE MARKETPLACE */}
          {activeTab === 'online' && online && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white">Screened Listings by Online Platform</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={online.platform_distribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="platform" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white">Surveillance Decisions</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={online.decision_distribution}
                        dataKey="count"
                        nameKey="decision"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {online.decision_distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: AI RISK TRENDS */}
          {activeTab === 'airisk' && aiRisk && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white">Fleet Risk Tier Breakdown</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={aiRisk.risk_level_distribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="level" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Bar dataKey="count" fill="#ec4899" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white">Top Anomaly Indicators Detected</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={aiRisk.top_anomaly_indicators} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" stroke="#94a3b8" />
                      <YAxis dataKey="anomaly" type="category" stroke="#94a3b8" tick={{ fontSize: 9 }} width={140} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Bar dataKey="count" fill="#f43f5e" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: COMPLIANCE INDEX */}
          {activeTab === 'compliance' && compliance && (
            <div className="space-y-6">
              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                  <div>
                    <h3 className="text-base font-bold text-white">8-Point Closed-Loop Compliance Index</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Continuous automated regulatory health score across all 11 phases</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-emerald-400 font-mono">{compliance.compliance_index}%</span>
                    <div className="text-[10px] text-slate-500">Sovereign Benchmark: 95.0%</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {compliance.dimensions.map((dim, idx) => (
                    <div key={idx} className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                      <div className="text-xs font-semibold text-slate-300">{dim.dimension}</div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold font-mono text-emerald-400">{dim.score}%</span>
                        <span className="text-[10px] text-slate-500">Target: {dim.target}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-1.5 rounded-full" 
                          style={{ width: `${Math.min(dim.score, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Regulatory Notice */}
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-500 leading-relaxed">
        <strong>Statutory Decision Support Disclaimer:</strong> PharmaSafe Intelligence analytics and evidentiary screening provide forensic decision support to licensed quality assurance officers and regulatory auditors. Inviolable statutory states (<code className="text-slate-400">EXPIRED</code>, <code className="text-slate-400">RECALLED</code>, <code className="text-slate-400">DESTROYED</code>, <code className="text-slate-400">DEAD_BATCH</code>) remain immutable and enforce zero-exception sale blocking regardless of analytical projections.
      </div>
    </div>
  );
}
