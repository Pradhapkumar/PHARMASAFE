import React, { useState, useMemo } from 'react';
import {
  ShieldCheck, ShieldX, Building2, Truck, Factory, Flame, AlertTriangle,
  CheckCircle2, XCircle, Clock, Search,
  Eye, Lock, Unlock, AlertOctagon, FileText, BadgeCheck,
  ChevronDown, ChevronUp, Activity, Globe, Flag, ClipboardList,
  Download, Landmark, Scale
} from 'lucide-react';

type EntityType = 'manufacturer' | 'distributor' | 'pharmacy' | 'disposal';
type LicenseStatus = 'authorized' | 'suspended' | 'expired' | 'pending' | 'revoked';
type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

interface LicensedEntity {
  id: string; name: string; type: EntityType; licenseNo: string;
  status: LicenseStatus; issueDate: string; expiryDate: string;
  state: string; city: string; contactPerson: string; lastAudit: string;
  complianceScore: number; activeBatches: number; flags: number;
}

interface SuspiciousCase {
  id: string; entityId: string; entityName: string; entityType: EntityType;
  caseType: string; severity: SeverityLevel; detectedAt: string;
  description: string; status: 'open' | 'under_review' | 'closed'; batchId?: string;
}

const ENTITIES: LicensedEntity[] = [
  { id: 'MFG001', name: 'PharmaCorp Industries Ltd', type: 'manufacturer', licenseNo: 'MFG-IND-2022-4891', status: 'authorized', issueDate: '2022-03-15', expiryDate: '2027-03-14', state: 'Maharashtra', city: 'Pune', contactPerson: 'Dr. Arvind Sharma', lastAudit: '2026-06-10', complianceScore: 96, activeBatches: 42, flags: 0 },
  { id: 'MFG002', name: 'BioMed Laboratories Pvt Ltd', type: 'manufacturer', licenseNo: 'MFG-KA-2021-3307', status: 'authorized', issueDate: '2021-07-01', expiryDate: '2026-06-30', state: 'Karnataka', city: 'Bengaluru', contactPerson: 'Ms. Priya Nair', lastAudit: '2025-11-20', complianceScore: 88, activeBatches: 28, flags: 1 },
  { id: 'MFG003', name: 'Sunrise Pharma Co', type: 'manufacturer', licenseNo: 'MFG-GJ-2019-1102', status: 'suspended', issueDate: '2019-01-10', expiryDate: '2024-01-09', state: 'Gujarat', city: 'Ahmedabad', contactPerson: 'Mr. Rakesh Patel', lastAudit: '2024-03-05', complianceScore: 41, activeBatches: 0, flags: 7 },
  { id: 'DIST001', name: 'MedLink Distribution Network', type: 'distributor', licenseNo: 'DIST-MH-2023-7720', status: 'authorized', issueDate: '2023-05-01', expiryDate: '2028-04-30', state: 'Maharashtra', city: 'Mumbai', contactPerson: 'Mr. Vikram Joshi', lastAudit: '2026-07-22', complianceScore: 93, activeBatches: 180, flags: 0 },
  { id: 'DIST002', name: 'SwiftMed Logistics', type: 'distributor', licenseNo: 'DIST-DL-2020-5531', status: 'expired', issueDate: '2020-08-15', expiryDate: '2025-08-14', state: 'Delhi', city: 'New Delhi', contactPerson: 'Ms. Anita Gupta', lastAudit: '2025-01-18', complianceScore: 62, activeBatches: 4, flags: 3 },
  { id: 'DIST003', name: 'HealthBridge Distributors', type: 'distributor', licenseNo: 'DIST-TN-2024-0091', status: 'pending', issueDate: '2024-09-01', expiryDate: '2029-08-31', state: 'Tamil Nadu', city: 'Chennai', contactPerson: 'Mr. Suresh Iyer', lastAudit: '2024-10-02', complianceScore: 79, activeBatches: 12, flags: 0 },
  { id: 'PHM001', name: 'CityMed Pharmacy Chain', type: 'pharmacy', licenseNo: 'PHM-MH-2022-8812', status: 'authorized', issueDate: '2022-11-01', expiryDate: '2027-10-31', state: 'Maharashtra', city: 'Mumbai', contactPerson: 'Dr. Meera Desai', lastAudit: '2026-08-15', complianceScore: 98, activeBatches: 320, flags: 0 },
  { id: 'PHM002', name: 'Apollo Health Retail', type: 'pharmacy', licenseNo: 'PHM-KA-2021-6671', status: 'authorized', issueDate: '2021-03-20', expiryDate: '2026-03-19', state: 'Karnataka', city: 'Bengaluru', contactPerson: 'Mr. Ravi Kumar', lastAudit: '2026-01-10', complianceScore: 91, activeBatches: 215, flags: 1 },
  { id: 'PHM003', name: 'QuickPharma Stores', type: 'pharmacy', licenseNo: 'PHM-UP-2018-2241', status: 'revoked', issueDate: '2018-06-15', expiryDate: '2023-06-14', state: 'Uttar Pradesh', city: 'Lucknow', contactPerson: 'Mr. Anil Singh', lastAudit: '2023-08-30', complianceScore: 18, activeBatches: 0, flags: 12 },
  { id: 'DSP001', name: 'EcoSafe Disposal Facility', type: 'disposal', licenseNo: 'DSP-MH-2023-3310', status: 'authorized', issueDate: '2023-01-01', expiryDate: '2028-12-31', state: 'Maharashtra', city: 'Nashik', contactPerson: 'Ms. Sunita Rao', lastAudit: '2026-05-20', complianceScore: 97, activeBatches: 0, flags: 0 },
  { id: 'DSP002', name: 'GreenDispose India', type: 'disposal', licenseNo: 'DSP-GJ-2022-1187', status: 'authorized', issueDate: '2022-04-10', expiryDate: '2027-04-09', state: 'Gujarat', city: 'Surat', contactPerson: 'Mr. Dinesh Mehta', lastAudit: '2026-03-15', complianceScore: 94, activeBatches: 0, flags: 0 },
];

const SUSPICIOUS_CASES: SuspiciousCase[] = [
  { id: 'SC-2026-001', entityId: 'MFG003', entityName: 'Sunrise Pharma Co', entityType: 'manufacturer', caseType: 'License Violation', severity: 'critical', detectedAt: '2026-09-01T10:30:00Z', description: 'Manufacturing license expired. Continued production detected post-suspension. 7 batches flagged for recall.', status: 'under_review', batchId: 'B5091' },
  { id: 'SC-2026-002', entityId: 'PHM003', entityName: 'QuickPharma Stores', entityType: 'pharmacy', caseType: 'Dead Batch Re-Entry', severity: 'critical', detectedAt: '2026-09-03T14:15:00Z', description: 'Destroyed batch B1001 scanned at this revoked pharmacy. Possible counterfeit re-entry attempt.', status: 'open', batchId: 'B1001' },
  { id: 'SC-2026-003', entityId: 'DIST002', entityName: 'SwiftMed Logistics', entityType: 'distributor', caseType: 'Expired License Operation', severity: 'high', detectedAt: '2026-08-28T09:00:00Z', description: 'Distributor operating with expired license. 4 active batch transfers recorded after expiry date.', status: 'under_review' },
  { id: 'SC-2026-004', entityId: 'MFG002', entityName: 'BioMed Laboratories', entityType: 'manufacturer', caseType: 'Temperature Excursion', severity: 'medium', detectedAt: '2026-09-05T16:45:00Z', description: 'Cold chain temperature deviation detected on batch B2218. Storage logs show 3-hour gap at >25°C.', status: 'open', batchId: 'B2218' },
  { id: 'SC-2026-005', entityId: 'PHM002', entityName: 'Apollo Health Retail', entityType: 'pharmacy', caseType: 'Quantity Mismatch', severity: 'low', detectedAt: '2026-09-07T11:20:00Z', description: 'Reported dispense count (342) exceeds received quantity (340) by 2 units. Under investigation.', status: 'open' },
];

const entityIcon = (type: EntityType) => {
  if (type === 'manufacturer') return <Factory className="w-4 h-4" />;
  if (type === 'distributor') return <Truck className="w-4 h-4" />;
  if (type === 'pharmacy') return <Building2 className="w-4 h-4" />;
  return <Flame className="w-4 h-4" />;
};

const entityColor = (type: EntityType) => {
  if (type === 'manufacturer') return 'text-violet-400 bg-violet-500/15 border-violet-500/30';
  if (type === 'distributor') return 'text-blue-400 bg-blue-500/15 border-blue-500/30';
  if (type === 'pharmacy') return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
  return 'text-orange-400 bg-orange-500/15 border-orange-500/30';
};

const STATUS: Record<LicenseStatus, { color: string; icon: React.ReactNode; label: string }> = {
  authorized: { color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30', icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: 'Authorized' },
  suspended:  { color: 'text-amber-400 bg-amber-500/15 border-amber-500/30',  icon: <Lock className="w-3.5 h-3.5" />,       label: 'Suspended' },
  expired:    { color: 'text-rose-400 bg-rose-500/15 border-rose-500/30',      icon: <Clock className="w-3.5 h-3.5" />,      label: 'Expired' },
  pending:    { color: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',icon: <Clock className="w-3.5 h-3.5" />,      label: 'Pending' },
  revoked:    { color: 'text-red-400 bg-red-500/15 border-red-500/30',         icon: <XCircle className="w-3.5 h-3.5" />,    label: 'Revoked' },
};

const SEV: Record<SeverityLevel, { color: string; bg: string }> = {
  critical: { color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/40' },
  high:     { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/40' },
  medium:   { color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/40' },
  low:      { color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/40' },
};

const ScoreBar: React.FC<{ score: number }> = ({ score }) => {
  const bar = score >= 90 ? 'bg-emerald-500' : score >= 70 ? 'bg-amber-500' : score >= 50 ? 'bg-orange-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-300 w-7 text-right">{score}</span>
    </div>
  );
};

const GovAuthorizationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'licenses' | 'suspicious' | 'verify'>('overview');
  const [filterType, setFilterType] = useState<EntityType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<LicenseStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEntity, setExpandedEntity] = useState<string | null>(null);
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<LicensedEntity | null | 'not_found'>(null);

  const stats = useMemo(() => ({
    total: ENTITIES.length,
    authorized: ENTITIES.filter(e => e.status === 'authorized').length,
    nonCompliant: ENTITIES.filter(e => ['suspended','expired','revoked'].includes(e.status)).length,
    openCases: SUSPICIOUS_CASES.filter(c => c.status === 'open').length,
    criticalCases: SUSPICIOUS_CASES.filter(c => c.severity === 'critical').length,
  }), []);

  const filtered = useMemo(() => ENTITIES.filter(e => {
    if (filterType !== 'all' && e.type !== filterType) return false;
    if (filterStatus !== 'all' && e.status !== filterStatus) return false;
    if (searchQuery && !e.name.toLowerCase().includes(searchQuery.toLowerCase()) && !e.licenseNo.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }), [filterType, filterStatus, searchQuery]);

  const handleVerify = () => {
    const q = verifyInput.trim().toLowerCase();
    const found = ENTITIES.find(e =>
      e.licenseNo.toLowerCase() === q || e.id.toLowerCase() === q || e.name.toLowerCase().includes(q)
    );
    setVerifyResult(found ?? 'not_found');
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'licenses', label: 'License Registry', icon: <ClipboardList className="w-3.5 h-3.5" /> },
    { id: 'suspicious', label: 'Suspicious Cases', icon: <AlertTriangle className="w-3.5 h-3.5" />, badge: stats.openCases },
    { id: 'verify', label: 'Instant Verify', icon: <BadgeCheck className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 p-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.15),transparent_60%)]" />
        <div className="absolute top-3 right-3 flex gap-2">
          <span className="text-[10px] font-mono bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 px-2 py-0.5 rounded">CDSCO PORTAL</span>
          <span className="text-[10px] font-mono bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />LIVE
          </span>
        </div>
        <div className="relative flex items-start gap-4">
          <div className="p-3 rounded-xl bg-indigo-500/20 border border-indigo-500/40">
            <Landmark className="w-8 h-8 text-indigo-300" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">🏛️ Government Authorization Hub</h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Central Drugs Standard Control Organisation (CDSCO) — Real-time license verification and enforcement across the pharmaceutical supply chain.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { label: '✅ Licensed Pharmacies', value: `${ENTITIES.filter(e=>e.type==='pharmacy'&&e.status==='authorized').length}/${ENTITIES.filter(e=>e.type==='pharmacy').length}` },
                { label: '✅ Authorized Distributors', value: `${ENTITIES.filter(e=>e.type==='distributor'&&e.status==='authorized').length}/${ENTITIES.filter(e=>e.type==='distributor').length}` },
                { label: '✅ Registered Manufacturers', value: `${ENTITIES.filter(e=>e.type==='manufacturer'&&e.status==='authorized').length}/${ENTITIES.filter(e=>e.type==='manufacturer').length}` },
                { label: '✅ Authorized Disposal', value: `${ENTITIES.filter(e=>e.type==='disposal'&&e.status==='authorized').length}/${ENTITIES.filter(e=>e.type==='disposal').length}` },
              ].map((item, i) => (
                <span key={i} className="text-xs bg-white/5 border border-white/10 text-slate-300 px-3 py-1 rounded-full">
                  {item.label}: <span className="font-bold text-white">{item.value}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900/60 border border-slate-800/70 rounded-xl p-1 w-fit flex-wrap">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.id ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/40' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}>
            {tab.icon}{tab.label}
            {tab.badge ? <span className="ml-1 text-[9px] bg-red-500/25 border border-red-500/40 text-red-400 px-1.5 py-0.5 rounded font-bold">{tab.badge}</span> : null}
          </button>
        ))}
      </div>

      {/* ═══ OVERVIEW ═══ */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Entities', value: stats.total, color: 'text-white', icon: <Globe className="w-4 h-4 text-slate-400" /> },
              { label: 'Authorized', value: stats.authorized, color: 'text-emerald-400', icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />, sub: `${Math.round(stats.authorized/stats.total*100)}% compliance` },
              { label: 'Non-Compliant', value: stats.nonCompliant, color: 'text-rose-400', icon: <ShieldX className="w-4 h-4 text-rose-400" />, sub: 'Suspended · Expired · Revoked' },
              { label: 'Open Cases', value: stats.openCases, color: 'text-amber-400', icon: <AlertOctagon className="w-4 h-4 text-amber-400" />, sub: `${stats.criticalCases} critical` },
            ].map((s, i) => (
              <div key={i} className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-4 flex items-start gap-3 hover:border-slate-700 transition-colors">
                <div className="p-2 rounded-lg bg-slate-800/60">{s.icon}</div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-mono">{s.label}</p>
                  <p className={`text-2xl font-black mt-0.5 ${s.color}`}>{s.value}</p>
                  {s.sub && <p className="text-xs text-slate-500 mt-0.5">{s.sub}</p>}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(['manufacturer','distributor','pharmacy','disposal'] as EntityType[]).map(type => {
              const typeEntities = ENTITIES.filter(e => e.type === type);
              const auth = typeEntities.filter(e => e.status === 'authorized').length;
              const pct = Math.round(auth / typeEntities.length * 100);
              const labels: Record<EntityType, string> = { manufacturer: 'Manufacturers', distributor: 'Distributors', pharmacy: 'Pharmacies', disposal: 'Disposal Facilities' };
              return (
                <div key={type} className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg border ${entityColor(type)}`}>{entityIcon(type)}</div>
                      <span className="text-sm font-bold text-slate-200">{labels[type]}</span>
                    </div>
                    <span className="text-xs font-mono text-slate-500">{auth}/{typeEntities.length}</span>
                  </div>
                  <div className="h-2 bg-slate-700/60 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${pct===100?'bg-emerald-500':pct>=60?'bg-amber-500':'bg-red-500'}`} style={{width:`${pct}%`}} />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className={pct===100?'text-emerald-400':pct>=60?'text-amber-400':'text-red-400'}>{pct}% authorized</span>
                    <span className="text-slate-500">{typeEntities.length-auth} non-compliant</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2"><AlertOctagon className="w-4 h-4 text-amber-400" />Recent Suspicious Cases</h3>
              <button onClick={() => setActiveTab('suspicious')} className="text-xs text-indigo-400 hover:text-indigo-300">View All →</button>
            </div>
            {SUSPICIOUS_CASES.slice(0,3).map(c => {
              const sv = SEV[c.severity];
              return (
                <div key={c.id} className={`flex items-start gap-3 p-3 rounded-lg border ${sv.bg}`}>
                  <Flag className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${sv.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-200">{c.caseType}</span>
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${sv.bg} ${sv.color}`}>{c.severity}</span>
                      {c.batchId && <span className="text-[9px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{c.batchId}</span>}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{c.entityName} — {c.description.slice(0,70)}...</p>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold border shrink-0 ${c.status==='open'?'bg-red-500/15 text-red-400 border-red-500/30':'bg-amber-500/15 text-amber-400 border-amber-500/30'}`}>
                    {c.status.replace('_',' ')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ LICENSE REGISTRY ═══ */}
      {activeTab === 'licenses' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input type="text" placeholder="Search by name or license no..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900/70 border border-slate-700/60 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60" />
            </div>
            <select value={filterType} onChange={e => setFilterType(e.target.value as any)}
              className="py-2 px-3 bg-slate-900/70 border border-slate-700/60 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500/60">
              <option value="all">All Types</option>
              <option value="manufacturer">Manufacturers</option>
              <option value="distributor">Distributors</option>
              <option value="pharmacy">Pharmacies</option>
              <option value="disposal">Disposal</option>
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
              className="py-2 px-3 bg-slate-900/70 border border-slate-700/60 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500/60">
              <option value="all">All Statuses</option>
              <option value="authorized">Authorized</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>
            <span className="text-xs text-slate-500 font-mono">{filtered.length} records</span>
          </div>

          <div className="space-y-2">
            {filtered.map(entity => {
              const sc = STATUS[entity.status];
              const ec = entityColor(entity.type);
              const isExp = expandedEntity === entity.id;
              return (
                <div key={entity.id} className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden hover:border-slate-700 transition-all">
                  <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpandedEntity(isExp ? null : entity.id)}>
                    <div className={`p-2 rounded-lg border ${ec}`}>{entityIcon(entity.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-200">{entity.name}</span>
                        <span className={`flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${sc.color}`}>{sc.icon}{sc.label}</span>
                        {entity.flags > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-400 flex items-center gap-1"><Flag className="w-3 h-3" />{entity.flags} flags</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-mono flex-wrap">
                        <span>{entity.licenseNo}</span><span>·</span><span>{entity.city}, {entity.state}</span><span>·</span><span>Expires: {entity.expiryDate}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="hidden sm:block text-right">
                        <p className="text-[10px] text-slate-500 mb-1">Compliance</p>
                        <div className="w-24"><ScoreBar score={entity.complianceScore} /></div>
                      </div>
                      {isExp ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </div>
                  </div>
                  {isExp && (
                    <div className="border-t border-slate-800/60 bg-slate-950/40 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      {[
                        ['Entity ID', entity.id], ['Contact Person', entity.contactPerson],
                        ['Issue Date', entity.issueDate], ['Expiry Date', entity.expiryDate],
                        ['Last Audit', entity.lastAudit], ['Active Batches', entity.activeBatches.toString()],
                        ['Compliance Score', `${entity.complianceScore}/100`], ['Total Flags', entity.flags.toString()],
                      ].map(([label, value], i) => (
                        <div key={i}>
                          <p className="text-slate-500 uppercase font-mono text-[10px]">{label}</p>
                          <p className="text-slate-200 font-semibold mt-0.5">{value}</p>
                        </div>
                      ))}
                      <div className="col-span-2 sm:col-span-4 flex gap-2 mt-2 pt-2 border-t border-slate-800/40 flex-wrap">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-[11px] font-semibold hover:bg-indigo-500/25"><Eye className="w-3 h-3" />Full Audit Trail</button>
                        {entity.status !== 'authorized' && <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold hover:bg-emerald-500/25"><Unlock className="w-3 h-3" />Restore License</button>}
                        {entity.status === 'authorized' && entity.flags === 0 && <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-semibold hover:bg-amber-500/25"><Lock className="w-3 h-3" />Suspend License</button>}
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/40 text-slate-400 text-[11px] font-semibold hover:text-white"><Download className="w-3 h-3" />Export Report</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ SUSPICIOUS CASES ═══ */}
      {activeTab === 'suspicious' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['critical','high','medium','low'] as SeverityLevel[]).map(sev => {
              const count = SUSPICIOUS_CASES.filter(c => c.severity === sev).length;
              const sv = SEV[sev];
              return (
                <div key={sev} className={`p-4 rounded-xl border ${sv.bg} flex items-center gap-3`}>
                  <Flag className={`w-4 h-4 ${sv.color}`} />
                  <div>
                    <p className="text-[10px] uppercase font-mono text-slate-500">{sev}</p>
                    <p className={`text-xl font-black ${sv.color}`}>{count}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="space-y-3">
            {SUSPICIOUS_CASES.map(c => {
              const sv = SEV[c.severity];
              const entity = ENTITIES.find(e => e.id === c.entityId);
              return (
                <div key={c.id} className={`bg-slate-900/60 border rounded-xl p-5 space-y-3 ${sv.bg}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg border ${entityColor(c.entityType)}`}>{entityIcon(c.entityType)}</div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-200">{c.caseType}</span>
                          <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded border ${sv.bg} ${sv.color}`}>{c.severity}</span>
                          <span className="text-[9px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">{c.id}</span>
                          {c.batchId && <span className="text-[9px] font-mono bg-indigo-900/50 border border-indigo-700/40 text-indigo-300 px-1.5 py-0.5 rounded">Batch: {c.batchId}</span>}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          <span className="text-slate-300 font-semibold">{c.entityName}</span>
                          {entity && <span className="text-slate-500"> · {entity.city}, {entity.state}</span>}
                          <span className="text-slate-500"> · {new Date(c.detectedAt).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span>
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded border font-semibold ${
                      c.status==='open'?'bg-red-500/15 text-red-400 border-red-500/30':c.status==='under_review'?'bg-amber-500/15 text-amber-400 border-amber-500/30':'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    }`}>{c.status.replace('_',' ').toUpperCase()}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed border-l-2 border-slate-700/60 pl-3">{c.description}</p>
                  <div className="flex gap-2 pt-1 flex-wrap">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-[11px] font-semibold hover:bg-indigo-500/25"><Eye className="w-3 h-3" />Investigate</button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/40 text-slate-400 text-[11px] font-semibold hover:text-white"><Scale className="w-3 h-3" />Escalate to Court</button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/40 text-slate-400 text-[11px] font-semibold hover:text-white"><FileText className="w-3 h-3" />Generate Notice</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ INSTANT VERIFY ═══ */}
      {activeTab === 'verify' && (
        <div className="max-w-2xl space-y-5">
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2"><BadgeCheck className="w-4 h-4 text-indigo-400" />Instant License Verification</h3>
            <p className="text-xs text-slate-500">Enter a license number, entity ID, or entity name to instantly verify authorization status.</p>
            <div className="flex gap-3">
              <input type="text" value={verifyInput} onChange={e => setVerifyInput(e.target.value)} onKeyDown={e => e.key==='Enter' && handleVerify()}
                placeholder="e.g. PHM-MH-2022-8812 or PHM001 or CityMed..."
                className="flex-1 px-4 py-2.5 bg-slate-950/60 border border-slate-700/60 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/60" />
              <button onClick={handleVerify} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors">
                <Search className="w-4 h-4" />Verify
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {['PHM-MH-2022-8812','MFG-GJ-2019-1102','PHM-UP-2018-2241','DIST-MH-2023-7720'].map(ex => (
                <button key={ex} onClick={() => { setVerifyInput(ex); setVerifyResult(null); }}
                  className="text-[10px] font-mono bg-slate-800/60 border border-slate-700/40 text-slate-400 hover:text-slate-200 px-2 py-1 rounded transition-colors">{ex}</button>
              ))}
            </div>
          </div>

          {verifyResult && verifyResult !== 'not_found' && (() => {
            const sc = STATUS[verifyResult.status];
            const ec = entityColor(verifyResult.type);
            const isGood = verifyResult.status === 'authorized';
            return (
              <div className={`rounded-xl border-2 p-5 space-y-4 ${isGood?'border-emerald-500/50 bg-emerald-950/20':['revoked','suspended'].includes(verifyResult.status)?'border-red-500/50 bg-red-950/20':'border-amber-500/50 bg-amber-950/20'}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl border ${ec}`}>{entityIcon(verifyResult.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-black text-white">{verifyResult.name}</h3>
                      <span className={`flex items-center gap-1.5 text-xs font-bold uppercase px-2.5 py-1 rounded-full border ${sc.color}`}>{sc.icon}{sc.label}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-mono">{verifyResult.licenseNo}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[['Entity Type', verifyResult.type.toUpperCase()],['Location',`${verifyResult.city}, ${verifyResult.state}`],['Issue Date',verifyResult.issueDate],['Expiry Date',verifyResult.expiryDate],['Compliance Score',`${verifyResult.complianceScore}/100`],['Total Flags',verifyResult.flags.toString()]].map(([label,value],i) => (
                    <div key={i} className="bg-black/20 rounded-lg p-2.5">
                      <p className="text-slate-500 text-[10px] uppercase font-mono">{label}</p>
                      <p className="text-slate-200 font-bold mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
                {!isGood && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>⚠️ This entity is <strong>{verifyResult.status}</strong>. All transactions must be blocked and escalated to CDSCO enforcement immediately.</span>
                  </div>
                )}
              </div>
            );
          })()}

          {verifyResult === 'not_found' && (
            <div className="rounded-xl border-2 border-slate-700/50 bg-slate-900/60 p-6 flex items-center gap-3 text-slate-400">
              <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-slate-200">Entity Not Found</p>
                <p className="text-xs mt-0.5">No registered entity matches your query. This may indicate an unlicensed operation.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GovAuthorizationPage;
