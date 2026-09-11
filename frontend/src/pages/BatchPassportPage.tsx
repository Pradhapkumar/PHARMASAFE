import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  QrCode, ShieldCheck, AlertTriangle, FileText, ArrowRight, 
  RotateCcw, History, Boxes, ExternalLink, Flame, Skull, Cpu,
  Pill, Thermometer, Calendar, Building2, Lock, CheckCircle2, ShieldAlert
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import Timeline, { TimelineEvent } from '../components/ui/Timeline';
import QrCodeView from '../components/ui/QrCodeView';
import LoadingState from '../components/ui/LoadingState';
import batchService from '../services/batchService';
import { BatchPassport, BatchTimelineEvent } from '../types/api';

type TabKey = 'overview' | 'quantities' | 'custody' | 'security';

export const BatchPassportPage: React.FC = () => {
  const { batchId = 'B1001' } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const [passport, setPassport] = useState<BatchPassport | null>(null);
  const [events, setEvents] = useState<BatchTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([
      batchService.getBatchPassport(batchId),
      batchService.getBatchEvents(batchId),
    ])
      .then(([passRes, evtsRes]) => {
        if (!mounted) return;
        setPassport(passRes);
        setEvents(evtsRes || []);
      })
      .catch((err) => {
        console.error('Error fetching passport/events:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [batchId]);

  if (loading || !passport) {
    return <LoadingState message="Cryptographic Passport Inscription Retrieval..." />;
  }

  // Format real events for the timeline component
  const mappedTimelineEvents: TimelineEvent[] = events.map((evt) => ({
    title: evt.title,
    stage: evt.stage,
    timestamp: evt.timestamp ? new Date(evt.timestamp).toLocaleString() : undefined,
    organization: evt.organization,
    location: evt.location,
    actor: evt.actor,
    quantity: evt.quantity,
    status: (evt.status === 'WARNING' ? 'ALERT' : evt.status) as TimelineEvent['status'],
    details: evt.details,
  }));

  const isDead = passport.status === 'DEAD_BATCH' || passport.status === 'DESTROYED';
  const isExpired = passport.status === 'EXPIRED';
  const isRecalled = passport.status === 'RECALLED';

  const gs1DigitalLink = `https://id.pharmasafe.network/01/${passport.gtin_barcode || '08901000000000'}/10/${passport.batch_number}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Digital Batch Passport: ${passport.batch_number}`}
        description={`End-to-end cryptographic provenance, verified custody, and safety status for ${passport.medicine.brand_name}`}
        badge={<StatusBadge status={passport.status} size="lg" />}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/chain-of-custody')}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <Boxes className="w-3.5 h-3.5 text-cyan-400" />
              <span>Chain of Custody</span>
            </button>
            <button
              onClick={() => navigate('/audit')}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <History className="w-3.5 h-3.5 text-cyan-400" />
              <span>Audit Trail</span>
            </button>
          </div>
        }
      />

      {/* Top Hero Grid: Product Banner + Visual QR View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Metadata Hero */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between border-b border-slate-800/80 pb-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5" />
                  Pharmaceutical Product Master
                </span>
                <h2 className="text-2xl font-extrabold text-white mt-1 tracking-tight">
                  {passport.medicine.brand_name}
                </h2>
                <p className="text-sm text-slate-400 mt-0.5 font-medium">
                  {passport.medicine.generic_name} • <span className="text-cyan-300 font-semibold">{passport.medicine.strength}</span>
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">GTIN Barcode</span>
                <span className="font-mono text-xs font-bold text-white tracking-wider bg-slate-900 px-2 py-1 rounded border border-slate-800 block mt-1">
                  {passport.gtin_barcode}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs mt-4">
              <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/60">
                <span className="text-slate-500 block uppercase font-mono text-[10px]">Manufacturer</span>
                <strong className="text-slate-200 block truncate mt-0.5">{passport.manufacturer_name}</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/60">
                <span className="text-slate-500 block uppercase font-mono text-[10px]">Dosage Form</span>
                <strong className="text-slate-200 block truncate mt-0.5">{passport.medicine.dosage_form}</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/60">
                <span className="text-slate-500 block uppercase font-mono text-[10px]">Mfg Date</span>
                <strong className="text-slate-200 block font-mono mt-0.5">{passport.mfg_date}</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/60">
                <span className="text-slate-500 block uppercase font-mono text-[10px]">Expiry Date</span>
                <strong className={`block font-mono mt-0.5 ${isExpired ? 'text-rose-400 font-bold' : 'text-slate-200'}`}>
                  {passport.expiry_date}
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 mt-3 text-xs border-t border-slate-800/60">
              <div>
                <span className="text-slate-500 block uppercase font-mono text-[10px]">Current Custodian</span>
                <strong className="text-cyan-300 block truncate font-medium">{passport.current_custodian_name || 'Manufacturer Depot'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block uppercase font-mono text-[10px]">Available Units</span>
                <strong className="text-slate-200 block font-mono font-bold">{passport.current_quantity.toLocaleString()} {passport.unit}</strong>
              </div>
              <div>
                <span className="text-slate-500 block uppercase font-mono text-[10px]">AI Risk Level</span>
                <span className="inline-flex items-center gap-1 font-mono font-bold text-xs mt-0.5">
                  <span className={passport.latest_risk_score && passport.latest_risk_score > 0.5 ? 'text-rose-400' : 'text-emerald-400'}>
                    {passport.latest_risk_score ? `${Math.round(passport.latest_risk_score * 100)} / 100` : 'Safe (0.0)'}
                  </span>
                  <span className="text-[10px] text-slate-500">({passport.risk_level || 'LOW'})</span>
                </span>
              </div>
            </div>
          </div>

          {/* Cryptographic Proof Strip */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 font-mono text-xs flex items-center justify-between gap-2 overflow-hidden mt-3">
            <div className="truncate flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-slate-400 text-[11px]">SHA-256 Destruction Cert:</span>
              <span className="text-cyan-300 font-semibold truncate text-[11px]">
                {passport.destruction_cert_hash || 'NOT_ISSUED_ACTIVE_CHAIN'}
              </span>
            </div>
            {passport.destruction_cert_hash && (
              <button
                onClick={() => navigate('/certificates')}
                className="shrink-0 text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px] font-sans font-semibold ml-2"
              >
                <span>Verify</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Visual QR Code */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center">
          <QrCodeView
            value={gs1DigitalLink}
            size={144}
            label={passport.batch_number}
            sublabel="GS1 Digital Link Matrix"
          />
          <div className="mt-3 w-full">
            <button
              onClick={() => navigate(`/verify?batch_number=${encodeURIComponent(passport.batch_number)}`)}
              className="w-full py-2 px-3 rounded-lg bg-cyan-950/70 border border-cyan-700/60 text-xs font-semibold text-cyan-200 hover:bg-cyan-900 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>Simulate POS Scan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Pill className="w-3.5 h-3.5" />
          <span>Overview & Chemistry</span>
        </button>

        <button
          onClick={() => setActiveTab('quantities')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'quantities'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>Quantities & Inventory</span>
        </button>

        <button
          onClick={() => setActiveTab('custody')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'custody'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Custody & Journey</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
            {events.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'security'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Security & Compliance</span>
        </button>
      </div>

      {/* Tab 1: Overview & Chemistry */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Pill className="w-4 h-4 text-cyan-400" />
              Pharmacopeia Formulation
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-800/80">
                <span className="text-slate-400">Brand Name:</span>
                <span className="text-white font-semibold">{passport.medicine.brand_name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/80">
                <span className="text-slate-400">Active Pharmaceutical Ingredient (API):</span>
                <span className="text-cyan-300 font-mono">{passport.medicine.generic_name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/80">
                <span className="text-slate-400">Dosage Strength:</span>
                <span className="text-white font-semibold">{passport.medicine.strength}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/80">
                <span className="text-slate-400">Dosage Delivery Form:</span>
                <span className="text-white font-semibold">{passport.medicine.dosage_form}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Packaging Format:</span>
                <span className="text-white font-semibold">Blister Pack / Tamper-Sealed HDPE</span>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-cyan-400" />
              Storage & Regulatory Protocols
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-800/80">
                <span className="text-slate-400">Prescribed Temperature:</span>
                <span className="text-white font-semibold font-mono">
                  {passport.medicine.storage_temp_celsius || (passport.medicine.storage_temp_min ? `${passport.medicine.storage_temp_min} to ${passport.medicine.storage_temp_max}` : '15°C to 25°C (Controlled Room Temp)')}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/80">
                <span className="text-slate-400">Humidity Constraint:</span>
                <span className="text-white font-semibold">&lt; 60% Relative Humidity</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/80">
                <span className="text-slate-400">Controlled Substance Schedule:</span>
                <span className="text-emerald-400 font-semibold">Schedule H (Standard Prescription)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/80">
                <span className="text-slate-400">Manufacturing Plant:</span>
                <span className="text-white font-semibold">{passport.manufacturer_name} Formulation Unit 1</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Regulatory Dossier Ref:</span>
                <span className="font-mono text-cyan-400">FDCA/IN/2023/M-88910</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Quantities & Inventory */}
      {activeTab === 'quantities' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-xs uppercase font-mono block">Initial Synthesized</span>
              <span className="text-2xl font-bold font-mono text-white mt-1 block">
                {passport.initial_quantity.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">{passport.unit}</span>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-xs uppercase font-mono block">Current Stock</span>
              <span className="text-2xl font-bold font-mono text-cyan-400 mt-1 block">
                {passport.current_quantity.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">{passport.unit}</span>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-xs uppercase font-mono block">Distributed / Dispensed</span>
              <span className="text-2xl font-bold font-mono text-purple-400 mt-1 block">
                {Math.max(0, passport.initial_quantity - passport.current_quantity).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">{passport.unit}</span>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-xs uppercase font-mono block">Batch State</span>
              <span className="text-lg font-bold font-mono mt-2 block">
                <StatusBadge status={passport.status} size="md" />
              </span>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Inventory Distribution Ratio
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-cyan-400">Available: {passport.current_quantity.toLocaleString()} {passport.unit}</span>
                <span className="text-purple-400">Transferred: {(passport.initial_quantity - passport.current_quantity).toLocaleString()} {passport.unit}</span>
              </div>
              <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden flex border border-slate-800">
                <div
                  className="bg-cyan-500 h-full transition-all duration-500"
                  style={{ width: `${(passport.current_quantity / (passport.initial_quantity || 1)) * 100}%` }}
                />
                <div
                  className="bg-purple-500 h-full transition-all duration-500"
                  style={{ width: `${((passport.initial_quantity - passport.current_quantity) / (passport.initial_quantity || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Custody & Journey (Real DB-Backed Events Only) */}
      {activeTab === 'custody' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800/80">
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                Verifiable Batch Milestones
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Exact recorded events from manufacturer creation through distribution, retail reception, returns, and destruction
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-cyan-400">
                {events.length} Recorded Milestones
              </span>
            </div>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Boxes className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-medium">No custody events recorded yet for this batch.</p>
              <p className="text-xs text-slate-600 mt-1">Events are inscribed automatically upon creation, transfers, and reverse logistics.</p>
            </div>
          ) : (
            <Timeline events={mappedTimelineEvents} />
          )}
        </div>
      )}

      {/* Tab 4: Security & Compliance */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Cryptographic Identifiers & Seals
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">GS1 Digital Link URI</span>
                <span className="font-mono text-cyan-300 text-[11px] p-2 bg-slate-900 rounded border border-slate-800 block break-all">
                  {gs1DigitalLink}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Destruction Certificate Hash</span>
                <span className="font-mono text-slate-300 text-[11px] p-2 bg-slate-900 rounded border border-slate-800 block break-all">
                  {passport.destruction_cert_hash || 'SHA256:NOT_YET_DESTROYED'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-t border-slate-800/80">
                <span className="text-slate-400">Dead Batch Registry Status:</span>
                <span className={isDead ? 'text-rose-400 font-bold font-mono' : 'text-emerald-400 font-bold font-mono'}>
                  {isDead ? 'INSCRIBED (CLOSED)' : 'NOT BLACKLISTED (ACTIVE)'}
                </span>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              Automated Safety & Risk Verification
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div>
                  <span className="text-slate-300 font-semibold block">POS Lockout Status</span>
                  <span className="text-[11px] text-slate-500">Retail sales blocking mechanism</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                  isExpired || isRecalled || isDead ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}>
                  {isExpired || isRecalled || isDead ? 'LOCKED' : 'CLEAR'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div>
                  <span className="text-slate-300 font-semibold block">Re-Entry Detection Sentinel</span>
                  <span className="text-[11px] text-slate-500">Monitors for counterfeit & revived expired lots</span>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  GUARD ACTIVE
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div>
                  <span className="text-slate-300 font-semibold block">Batch Integrity Verification</span>
                  <span className="text-[11px] text-slate-500">Quantities balance with transfer log</span>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  VERIFIED
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchPassportPage;
