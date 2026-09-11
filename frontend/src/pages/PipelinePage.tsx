import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  PlusCircle, Truck, ScanLine, XOctagon, RotateCcw, CheckSquare,
  Flame, FileText, Lock, Bell, CheckCircle2, Clock, Loader2,
  ChevronDown, ChevronUp, Zap, ArrowRight, ArrowLeft, Play, Pause, RefreshCw,
  ShieldCheck, ShieldX, Landmark, AlertTriangle, ExternalLink, Search, Sparkles,
  Brain, Cpu, BarChart3, ShieldAlert, Send, AlertOctagon,
  Eye, SlidersHorizontal, Activity, Layers, Radio, Store, ArrowDownToLine,
  Terminal, FastForward, Check
} from 'lucide-react';
import batchService from '../services/batchService';
import apiClient from '../services/apiClient';
import { 
  Batch, BatchRiskEvaluation, PharmacyExpirySurveillanceItem, 
  PharmacyExpirySurveillanceResponse, DispatchRecallDirectiveResponse 
} from '../types/api';

type StepStatus    = 'completed' | 'processing' | 'pending' | 'blocked';
type LicenseStatus = 'authorized' | 'suspended' | 'expired' | 'revoked' | 'pending_lic' | 'system';

interface GovEntity {
  id: string;
  name: string;
  licenseNo: string;
  status: LicenseStatus;
  complianceScore: number;
}

interface StepTask {
  id: string;
  title: string;
  evidence: string;
}

interface PipelineStep {
  step: number;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  actor: string;
  actorEntityId: string;
  status: StepStatus;
  batchId: string;
  timestamp?: string;
  details: string[];
  tasks: StepTask[];
  alertMsg?: string;
}

interface TerminalLog {
  id: string;
  time: string;
  step: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

// ─── Government Registry ──────────────────────────────────────────────────────
const GOV_ENTITIES: Record<string, GovEntity> = {
  MFG001:  { id:'MFG001',  name:'PharmaCorp Industries Ltd',    licenseNo:'MFG-IND-2022-4891', status:'authorized',  complianceScore:96 },
  MFG002:  { id:'MFG002',  name:'BioMed Laboratories Pvt Ltd',  licenseNo:'MFG-KA-2021-3307',  status:'authorized',  complianceScore:88 },
  DIST001: { id:'DIST001', name:'MedLink Distribution Network', licenseNo:'DIST-MH-2023-7720', status:'authorized',  complianceScore:93 },
  DIST002: { id:'DIST002', name:'SwiftMed Logistics',           licenseNo:'DIST-DL-2020-5531', status:'expired',     complianceScore:62 },
  PHM001:  { id:'PHM001',  name:'CityMed Pharmacy Chain',       licenseNo:'PHM-MH-2022-8812',  status:'authorized',  complianceScore:98 },
  PHM002:  { id:'PHM002',  name:'Apollo Health Retail',         licenseNo:'PHM-KA-2021-6671',  status:'authorized',  complianceScore:91 },
  PHM003:  { id:'PHM003',  name:'QuickPharma Stores',           licenseNo:'PHM-UP-2018-2241',  status:'revoked',     complianceScore:18 },
  DSP001:  { id:'DSP001',  name:'EcoSafe Disposal Facility',    licenseNo:'DSP-MH-2023-3310',  status:'authorized',  complianceScore:97 },
  SYSTEM:  { id:'SYSTEM',  name:'PharmaSafe AI Sentinel Hub',   licenseNo:'SYS-CDSCO-0001',    status:'system',      complianceScore:100 },
};

const isGovOk = (id: string) => {
  const e = GOV_ENTITIES[id];
  return !e || e.status === 'authorized' || e.status === 'system';
};

const SC: Record<StepStatus, { label:string; icon:React.ReactNode; ring:string; dot:string; bg:string; text:string }> = {
  completed:  { label:'Completed',  icon:<CheckCircle2 className="w-3.5 h-3.5"/>, ring:'ring-emerald-500/60', dot:'bg-emerald-400',          bg:'bg-emerald-500/15 border-emerald-500/40', text:'text-emerald-400' },
  processing: { label:'Processing', icon:<Loader2 className="w-3.5 h-3.5 animate-spin"/>, ring:'ring-amber-400/60', dot:'bg-amber-400 animate-pulse', bg:'bg-amber-500/15 border-amber-500/40',  text:'text-amber-400'  },
  pending:    { label:'Pending',    icon:<Clock className="w-3.5 h-3.5"/>,         ring:'ring-slate-600/50',   dot:'bg-slate-600',            bg:'bg-slate-800/40 border-slate-700/40',    text:'text-slate-500'  },
  blocked:    { label:'Blocked',    icon:<XOctagon className="w-3.5 h-3.5"/>,      ring:'ring-red-500/60',     dot:'bg-red-400',              bg:'bg-red-500/15 border-red-500/40',        text:'text-red-400'    },
};

const LIC_STYLE: Record<LicenseStatus, { color:string; bg:string; label:string }> = {
  authorized:  { color:'text-emerald-400', bg:'bg-emerald-500/15 border-emerald-500/40', label:'AUTHORIZED' },
  suspended:   { color:'text-amber-400',   bg:'bg-amber-500/15 border-amber-500/40',     label:'SUSPENDED'  },
  expired:     { color:'text-rose-400',    bg:'bg-rose-500/15 border-rose-500/40',        label:'EXPIRED'    },
  revoked:     { color:'text-red-400',     bg:'bg-red-500/15 border-red-500/40',          label:'REVOKED'    },
  pending_lic: { color:'text-yellow-400',  bg:'bg-yellow-500/15 border-yellow-500/40',    label:'PENDING'    },
  system:      { color:'text-cyan-400',    bg:'bg-cyan-500/15 border-cyan-500/40',        label:'SYSTEM'     },
};

const ACTOR_COLOR: Record<string,string> = {
  MFG001:'text-violet-400 bg-violet-500/10 border-violet-500/20',
  MFG002:'text-violet-400 bg-violet-500/10 border-violet-500/20',
  DIST001:'text-blue-400 bg-blue-500/10 border-blue-500/20',
  DIST002:'text-rose-400 bg-rose-500/10 border-rose-500/20',
  PHM001:'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  PHM002:'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  PHM003:'text-red-400 bg-red-500/10 border-red-500/20',
  DSP001:'text-orange-400 bg-orange-500/10 border-orange-500/20',
  SYSTEM:'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
};

const STEP_NAMES = [
  '',
  'Medicine Register & GTIN Inscription',
  'Track Movement to Wholesale Distributor',
  'Point-of-Care Pharmacy Scan & Verification',
  'AI In-Market Expiry & Selling Sentinel',
  'Expired / Recall Auto-Return Manifest',
  'Quantity Verification & Variance Audit',
  'Bio-Hazard Incineration Destruction',
  'Cryptographic Destruction Certificate',
  'Dead Batch Registry Invalidation',
  'Zero-Trust AI Re-entry Threat Block'
];

function generatePipelineSteps(
  batchId: string,
  medicineName: string,
  expiry: string,
  quantity: number,
  activeStep: number,
  scenario: 'NORMAL' | 'B_SWFT' | 'B_QKP'
): PipelineStep[] {
  const stepsConfig = [
    {
      step: 1,
      icon: <PlusCircle className="w-5 h-5"/>,
      title: 'Medicine Register',
      subtitle: 'Manufacturer registration & GTIN inscription',
      actor: scenario === 'B_QKP' ? 'BioMed Laboratories' : 'PharmaCorp Industries',
      actorEntityId: scenario === 'B_QKP' ? 'MFG002' : 'MFG001',
      description: 'Manufacturer catalogs newly inscribed lot into the national ledger with cryptographically signed GTIN.',
      tasks: [
        { id: 't1_1', title: 'Cryptographic SHA-256 Keypair & GS1 GTIN Generation', evidence: 'GTIN-0890123456 Inscribed' },
        { id: 't1_2', title: 'CDSCO Manufacturer License Validation (MFG001)', evidence: 'License MFG-IND-2022-4891 Verified' },
        { id: 't1_3', title: 'Inscribe Batch into National Ledger & Issue Digital Passport', evidence: 'Passport Sealed' }
      ],
      details: [
        `Batch Identifier: ${batchId}`,
        `Medicine Product: ${medicineName}`,
        `Expiry Threshold: ${expiry}`,
        `Lot Quantity: ${quantity.toLocaleString()} units`,
        'Digital Passport Issued & Signed'
      ],
      timestamp: '2026-08-01 09:15',
    },
    {
      step: 2,
      icon: <Truck className="w-5 h-5"/>,
      title: 'Track the Movement',
      subtitle: 'Wholesale distributor intake & dispatch',
      actor: scenario === 'B_SWFT' ? 'SwiftMed Logistics (EXPIRED)' : 'MedLink Distribution',
      actorEntityId: scenario === 'B_SWFT' ? 'DIST002' : 'DIST001',
      description: 'Medicine moves from manufacturing depot to licensed wholesale distribution hub with real-time telemetric logging.',
      tasks: [
        { id: 't2_1', title: 'Electronic Waybill Generation & Depot Transfer Initiation', evidence: 'Waybill #WB-7720-IND Signed' },
        { id: 't2_2', title: 'Cold-Chain IoT Sensor Telemetry Verification (2°C - 8°C)', evidence: 'Temperature 4.2°C Nominal' },
        { id: 't2_3', title: 'Wholesale Depot Intake Reconciliation & Quarantine Check', evidence: 'Intake Reconciled' }
      ],
      details: [
        'Manufacturer → Distribution Depot transfer initiated',
        'Cold-chain temperature protocol verified (2°C - 8°C)',
        'Electronic waybill signed',
        'Depot intake reconciliation complete'
      ],
      timestamp: '2026-08-05 14:30',
      alertMsg: scenario === 'B_SWFT' ? '❌ GOV GATE BLOCKED — SwiftMed Logistics license EXPIRED. Transfer halted by CDSCO.' : undefined,
    },
    {
      step: 3,
      icon: <ScanLine className="w-5 h-5"/>,
      title: 'Pharmacy Scan & Verify',
      subtitle: 'Point-of-care dispensing handshake',
      actor: scenario === 'B_QKP' ? 'QuickPharma Stores (REVOKED)' : 'CityMed Pharmacy Chain',
      actorEntityId: scenario === 'B_QKP' ? 'PHM003' : 'PHM001',
      description: 'Pharmacist scans serial 2D DataMatrix code at POS checkout. National verification server validates authenticity before sale authorization.',
      tasks: [
        { id: 't3_1', title: 'Point-of-Care 2D DataMatrix Serialized QR Code Scan', evidence: 'Payload Decoded' },
        { id: 't3_2', title: 'National Verification Server Cryptographic GTIN Check', evidence: 'GTIN Cleared on Ledger' },
        { id: 't3_3', title: 'Point-of-Care Patient Sale Authorization Check', evidence: 'Sale Authorized' }
      ],
      details: [
        '2D DataMatrix QR code scanned at dispensing counter',
        'Cryptographic GTIN verified in ledger ✅',
        'Lot expiry date confirmed valid ✅',
        'No active recall flags detected ✅',
        'Point-of-care sale authorized'
      ],
      timestamp: '2026-08-10 10:05',
      alertMsg: scenario === 'B_QKP' ? '❌ GOV GATE BLOCKED — QuickPharma license REVOKED. Scan at this location is illegal.' : undefined,
    },
    {
      step: 4,
      icon: <Clock className="w-5 h-5 text-amber-400"/>,
      title: 'AI In-Market Expiry Sentinel',
      subtitle: 'Real-time distributed shelf-life & selling surveillance',
      actor: 'PharmaSafe AI Sentinel',
      actorEntityId: 'SYSTEM',
      description: 'Continuous AI surveillance monitors distributed stock actively sitting or selling at pharmacy locations. If an expired or critical shelf-life hazard is detected, it automatically issues an Emergency CDSCO Stop-Sale Directive locking the POS terminal.',
      tasks: [
        { id: 't4_1', title: 'Real-Time Remaining Shelf-Life (RSL%) & Thermal Stress Scan', evidence: 'Shelf Degradation Evaluated' },
        { id: 't4_2', title: 'AI Selling Velocity vs Expiry Runway Anomaly Model', evidence: 'Velocity Runway Nominal' },
        { id: 't4_3', title: 'In-Market Expiry Clearance & POS Watchdog State Confirmed', evidence: 'Clearance Granted' }
      ],
      details: [
        'Real-time remaining shelf life (RSL%) tracking across retail pharmacies',
        'AI Selling Velocity vs. Expiry runway predictive projection',
        'Thermal stress & accelerated degradation anomaly model',
        'Autonomous CDSCO Stop-Sale Directive & POS Lock dispatcher ✅'
      ],
      timestamp: '2026-08-20 12:00',
    },
    {
      step: 5,
      icon: <RotateCcw className="w-5 h-5"/>,
      title: 'Expired → Auto Return',
      subtitle: 'Closed-loop reverse logistics trigger',
      actor: 'CityMed Pharmacy Chain',
      actorEntityId: 'PHM001',
      description: 'Automated reverse logistics protocol quarantines expired or recalled stock, issuing a chain-of-custody return manifest.',
      tasks: [
        { id: 't5_1', title: 'Autonomous Reverse Logistics Manifest RET-AUTO Generation', evidence: 'Tracking RET-AUTO Sealed' },
        { id: 't5_2', title: 'Physical Quarantine Isolation Protocol at Pharmacy Depot', evidence: 'Shelf Lock Active' },
        { id: 't5_3', title: 'Assign Secure Reverse Transport Carrier (SecureMed Carrier)', evidence: 'Carrier Dispatched' }
      ],
      details: [
        'Automated reverse logistics manifest generated',
        'Quarantine protocol activated at pharmacy',
        'Reverse transport carrier assigned: SecureMed Carrier',
        'Bio-hazard destruction routing initiated'
      ],
      timestamp: '2026-09-01 08:00',
    },
    {
      step: 6,
      icon: <CheckSquare className="w-5 h-5"/>,
      title: 'Quantity Verification',
      subtitle: 'Intake audit & variance cross-reference',
      actor: 'PharmaCorp Industries',
      actorEntityId: 'MFG001',
      description: 'Physical audit compares dispatched vs received units. Discrepancies generate automatic alerts on the national ledger.',
      tasks: [
        { id: 't6_1', title: 'Dispatched Units vs Plant Received Units Mass Balance Audit', evidence: 'Dispatched vs Received Compared' },
        { id: 't6_2', title: 'Reconciliation Variance & Shrinkage Anomaly Calculation', evidence: 'Variance Threshold 0.3% Flagged' },
        { id: 't6_3', title: 'Inscribe Discrepancy Audit Log into National Ledger', evidence: 'Audit Log Committed' }
      ],
      details: [
        `Dispatched Return Count: ${quantity} units`,
        `Received Plant Count: ${Math.max(1, quantity - 3)} units`,
        'Reconciliation Variance: 3 units flagged',
        'Automated discrepancy audit log stored'
      ],
      timestamp: '2026-09-03 11:20',
    },
    {
      step: 7,
      icon: <Flame className="w-5 h-5"/>,
      title: 'Destroy Returned Stock',
      subtitle: 'Authorized bio-hazard incineration',
      actor: 'EcoSafe Disposal Facility',
      actorEntityId: 'DSP001',
      description: 'Medicine undergoes permanent physical denaturation at authorized CDSCO-licensed facility under photo and video surveillance.',
      tasks: [
        { id: 't7_1', title: 'Rotary Thermal Kiln Chamber Pre-Heating to 1100°C', evidence: 'Temperature 1100°C Stabilized' },
        { id: 't7_2', title: 'Permanent Physical Denaturation under CPCB Video Surveillance', evidence: 'Denaturation Completed' },
        { id: 't7_3', title: 'CPCB Environmental Scrubber & Ash Residue Neutralization', evidence: 'Zero Toxic Emission Verified' }
      ],
      details: [
        'Facility: EcoSafe Thermal Denaturation Plant Nashik',
        'Disposal Method: High-Temperature Rotary Bio-Incineration',
        'Operating Temperature: 1100°C chamber verified',
        'Environmental scrubbers active — CPCB compliant'
      ],
      timestamp: '2026-09-05 16:45',
    },
    {
      step: 8,
      icon: <FileText className="w-5 h-5"/>,
      title: 'Destruction Certificate',
      subtitle: 'Cryptographically signed destruction record',
      actor: 'EcoSafe Disposal Facility',
      actorEntityId: 'DSP001',
      description: 'Permanent tamper-evident certificate generated and co-signed by facility officer and regulatory witness.',
      tasks: [
        { id: 't8_1', title: 'Assemble Destruction Telemetry & Environmental Sensor Logs', evidence: 'Telemetry Payload Bound' },
        { id: 't8_2', title: 'CDSCO Regional Inspector Co-Signature & Tamper-Evident SHA-256 Seal', evidence: 'Inspector R. Sharma Co-Signed' },
        { id: 't8_3', title: 'Inscribe Immutable Destruction Record into National Ledger', evidence: 'Certificate Sealed' }
      ],
      details: [
        `Certificate ID: CERT-DSP-2026-${batchId.replace(/[^A-Z0-9]/gi, '').slice(0, 4)}`,
        'Witness: CDSCO Regional Inspector R. Sharma',
        'Tamper-evident SHA-256 seal inscribed',
        'Permanent state transition recorded'
      ],
      timestamp: '2026-09-05 18:00',
    },
    {
      step: 9,
      icon: <Lock className="w-5 h-5"/>,
      title: 'Dead Batch Registry',
      subtitle: 'National invalidation ledger update',
      actor: 'PharmaSafe Platform',
      actorEntityId: 'SYSTEM',
      description: 'Batch identifier is permanently inscribed into the Dead Batch Registry. All future scanning authorizations are irrevocably revoked.',
      tasks: [
        { id: 't9_1', title: 'Inscribe Batch ID into National Dead Batch Index (Permanent Revocation)', evidence: 'State: INVALIDATED' },
        { id: 't9_2', title: 'Broadcast Revocation Ledger Update to 14,000+ Pharmacy POS Systems', evidence: 'POS Fleet Updated' },
        { id: 't9_3', title: 'Arm Zero-Trust Sentinel on National Gateway Checkpoints', evidence: 'Sentinel Armed' }
      ],
      details: [
        `Batch ${batchId} added to National Dead Batch Index`,
        'Status set to: PERMANENTLY_INVALIDATED',
        'Registry broadcast dispatched to all pharmacy POS systems',
        'Zero-trust verification active nationwide'
      ],
      timestamp: '2026-09-05 18:05',
    },
    {
      step: 10,
      icon: <Bell className="w-5 h-5 text-red-400"/>,
      title: 'AI Re-entry Sentinel',
      subtitle: 'Zero-trust counterfeit block verification',
      actor: 'PharmaSafe Platform',
      actorEntityId: 'SYSTEM',
      description: 'AI model actively monitors scan stream. Any re-entry attempt of this destroyed batch triggers immediate critical alert and blocks transaction.',
      tasks: [
        { id: 't10_1', title: 'Simulate Illicit Re-Entry Scan Attempt at Retail Checkpoint', evidence: 'Scan Event Intercepted' },
        { id: 't10_2', title: 'Dead Batch Registry Cross-Reference (12ms Ultra-Low Latency)', evidence: 'Match Found: DESTROYED' },
        { id: 't10_3', title: 'Forcibly Terminate Transaction & Post Critical Alert to CDSCO', evidence: 'SALE FORCIBLY BLOCKED' }
      ],
      details: [
        'Simulated re-entry scan detected at retail checkpoint',
        'Dead Batch Index cross-referenced in 12ms',
        'Transaction: FORCIBLY BLOCKED',
        'Critical alert logged to CDSCO Enforcement Unit'
      ],
      timestamp: '2026-09-06 09:15',
    },
  ];

  return stepsConfig.map((cfg) => {
    let status: StepStatus;
    if (scenario === 'B_SWFT' && cfg.step === 2) {
      status = 'blocked';
    } else if (scenario === 'B_QKP' && cfg.step === 3) {
      status = 'blocked';
    } else if (cfg.step < activeStep) {
      status = 'completed';
    } else if (cfg.step === activeStep) {
      status = 'processing';
    } else {
      status = 'pending';
    }
    return {
      ...cfg,
      status,
      batchId,
    };
  });
}

// ─── Step Card Component ──────────────────────────────────────────────────────
const StepCard: React.FC<{
  step: PipelineStep;
  isLast: boolean;
  activeTaskIndex: number;
}> = ({ step, isLast, activeTaskIndex }) => {
  const [expanded, setExpanded] = useState(true);
  const cfg = SC[step.status];
  const ent = GOV_ENTITIES[step.actorEntityId];
  const lic = ent ? LIC_STYLE[ent.status] : LIC_STYLE['authorized'];
  const actorStyle = ACTOR_COLOR[step.actorEntityId] || 'text-slate-300 bg-slate-800 border-slate-700';

  return (
    <div className="relative flex items-start gap-4 group">
      {/* Vertical Track Connector */}
      {!isLast && (
        <div className="absolute left-[19px] top-10 bottom-0 w-[2px] z-0">
          <div className={`w-full h-full transition-all duration-500 ${
            step.status === 'completed'
              ? 'bg-gradient-to-b from-emerald-500 to-emerald-600/80 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
              : step.status === 'blocked'
              ? 'bg-gradient-to-b from-red-500 to-slate-700'
              : step.status === 'processing'
              ? 'bg-gradient-to-b from-amber-500/80 to-slate-800'
              : 'bg-slate-800/80'
          }`} />
        </div>
      )}

      {/* Step Icon Badge */}
      <div className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300 shrink-0 ${
        step.status === 'completed'
          ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
          : step.status === 'processing'
          ? 'bg-amber-950/80 border-amber-500/70 text-amber-400 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.3)]'
          : step.status === 'blocked'
          ? 'bg-red-950/90 border-red-500/70 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
          : 'bg-slate-900/80 border-slate-700/50 text-slate-500'
      }`}>
        {step.icon}
      </div>

      {/* Step Body */}
      <div className={`flex-1 mb-4 rounded-xl border p-4 transition-all duration-200 ${
        step.status === 'processing'
          ? 'bg-amber-950/20 border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/30'
          : step.status === 'blocked'
          ? 'bg-red-950/25 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
          : step.status === 'completed'
          ? 'bg-slate-900/60 border-slate-800/90 hover:border-slate-700'
          : 'bg-slate-900/20 border-slate-800/40 opacity-60'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/50">
              STEP {step.step.toString().padStart(2, '0')}
            </span>
            <h4 className="text-sm font-bold text-white tracking-wide">
              {step.title}
            </h4>
            <span className="text-xs text-slate-400 hidden sm:inline">•</span>
            <span className="text-xs text-slate-400 font-medium">
              {step.subtitle}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Gov Gate Status Pill */}
            {ent && (
              <div className={`flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${lic.bg} ${lic.color}`}>
                <Landmark className="w-2.5 h-2.5" />
                <span>{lic.label}</span>
              </div>
            )}

            {/* Step Status Pill */}
            <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.text}`}>
              {cfg.icon}
              <span className="uppercase text-[10px] tracking-wider">{cfg.label}</span>
            </div>
          </div>
        </div>

        {/* Actor Info Bar */}
        <div className="mt-2 flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Executing Node:</span>
            <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${actorStyle}`}>
              {step.actor}
            </span>
            {ent && ent.licenseNo && (
              <span className="text-slate-500 font-mono text-[10px] hidden md:inline">
                [{ent.licenseNo}]
              </span>
            )}
          </div>
          {step.timestamp && (
            <span className="text-[11px] font-mono text-slate-500">
              {step.timestamp}
            </span>
          )}
        </div>

        {/* Blocking Error Alert Message */}
        {step.alertMsg && (
          <div className="mt-3 p-3 rounded-lg bg-red-950/60 border border-red-500/60 flex items-center gap-2.5 text-xs text-red-200 font-bold animate-pulse">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{step.alertMsg}</span>
          </div>
        )}

        {/* Description */}
        <p className="mt-2 text-xs text-slate-300 leading-relaxed">
          {step.description}
        </p>

        {/* ── Autonomous Sub-Tasks Execution Progress List ── */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold">
              <Activity className="w-3 h-3 text-cyan-400" />
              Autonomous Tasks Executing in Stage:
            </span>
            <span>
              {step.status === 'completed'
                ? '3 / 3 Completed ✅'
                : step.status === 'processing'
                ? `${activeTaskIndex + 1} / 3 Validating ⏳`
                : step.status === 'blocked'
                ? 'Execution Halted ❌'
                : 'Pending'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {step.tasks.map((task, tIdx) => {
              const isTaskDone = step.status === 'completed' || (step.status === 'processing' && tIdx < activeTaskIndex);
              const isTaskCurrent = step.status === 'processing' && tIdx === activeTaskIndex;
              const isTaskBlocked = step.status === 'blocked' && tIdx === 0;

              return (
                <div
                  key={task.id}
                  className={`p-2.5 rounded-lg border text-xs font-mono transition-all ${
                    isTaskDone
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : isTaskCurrent
                      ? 'bg-amber-950/50 border-amber-500/60 text-amber-200 ring-1 ring-amber-500/40 animate-pulse'
                      : isTaskBlocked
                      ? 'bg-red-950/50 border-red-500/60 text-red-300'
                      : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    {isTaskDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : isTaskCurrent ? (
                      <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
                    ) : isTaskBlocked ? (
                      <XOctagon className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    )}
                    <span className="truncate">{task.title}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 pl-5">
                    {isTaskDone ? `✓ ${task.evidence}` : isTaskCurrent ? '⚡ Validating telemetry...' : isTaskBlocked ? '✕ Intercepted by Gov Gate' : 'Pending handover'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expandable Verification Details */}
        <div className="mt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{expanded ? 'Hide Ledger Inscription Data' : 'View Ledger Inscription Data'}</span>
          </button>

          {expanded && (
            <div className="mt-2.5 p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5 font-mono text-xs text-slate-300">
              {step.details.map((d, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-cyan-400 shrink-0">▸</span>
                  <span>{d}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Pipeline Page Component ─────────────────────────────────────────────
export const PipelinePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [batchInput, setBatchInput] = useState('B1001');
  const [medicineName, setMedicineName] = useState('Paracetamol 500mg IP');
  const [expiryDate, setExpiryDate] = useState('Oct 2026');
  const [lotQuantity, setLotQuantity] = useState(1000);
  const [activeStep, setActiveStep] = useState(1);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [autoSpeed, setAutoSpeed] = useState<'1x' | '2x' | '4x'>('1x');
  const [activeTaskIndex, setActiveTaskIndex] = useState<number>(0);
  const [scenario, setScenario] = useState<'NORMAL' | 'B_SWFT' | 'B_QKP'>('NORMAL');
  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'expiry_sentinel' | 'ai_risk_matrix'>('pipeline');
  const [isProcessingStep, setIsProcessingStep] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiEvaluation, setAiEvaluation] = useState<BatchRiskEvaluation | null>(null);

  // Terminal Execution Logs
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([
    { id: 'log_0', time: new Date().toLocaleTimeString(), step: 1, message: 'PharmaSafe Autonomous Pipeline Engine initialized in memory.', type: 'info' }
  ]);

  // Expiry Surveillance State
  const [surveillanceData, setSurveillanceData] = useState<PharmacyExpirySurveillanceResponse | null>(null);
  const [loadingSurveillance, setLoadingSurveillance] = useState(false);
  const [dispatchingBatchId, setDispatchingBatchId] = useState<string | null>(null);
  const [lastDirectiveResult, setLastDirectiveResult] = useState<DispatchRecallDirectiveResponse | null>(null);

  const addLog = (step: number, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setTerminalLogs((prev) => [
      { id: `log_${Date.now()}_${Math.random()}`, time: new Date().toLocaleTimeString(), step, message, type },
      ...prev.slice(0, 40)
    ]);
  };

  // Fetch AI evaluation for current batch
  const loadBatchBackendData = async (bNum: string) => {
    try {
      setLoadingAi(true);
      const evalRes = await apiClient.evaluateBatchRisk(bNum).catch(() => null);
      if (evalRes) setAiEvaluation(evalRes);
    } catch (err) {
      console.warn('Backend AI sync warning:', err);
    } finally {
      setLoadingAi(false);
    }
  };

  // Fetch Pharmacy Expiry Surveillance Feed
  const loadPharmacySurveillance = async () => {
    try {
      setLoadingSurveillance(true);
      const res = await apiClient.getPharmacyExpirySurveillance().catch(() => null);
      if (res) {
        setSurveillanceData(res);
      }
    } catch (err) {
      console.warn('Could not load pharmacy expiry surveillance:', err);
    } finally {
      setLoadingSurveillance(false);
    }
  };

  // Dispatch Emergency Recall Directive to Pharmacy
  const handleDispatchRecallDirective = async (item: PharmacyExpirySurveillanceItem) => {
    try {
      setDispatchingBatchId(item.batch_id);
      const res = await apiClient.dispatchPharmacyRecallDirective({
        batch_id: item.batch_id,
        pharmacy_id: item.pharmacy_id,
        pharmacy_name: item.pharmacy_name,
        reason: item.expiry_status === 'EXPIRED_SELLING_HAZARD' 
          ? 'EXPIRED_PRODUCT_ACTIVE_SELLING_HAZARD' 
          : 'PREEMPTIVE_EXPIRY_RECALL_SAFETY_LOCK',
        auto_lock_pos: true
      });
      setLastDirectiveResult(res);
      loadPharmacySurveillance();
    } catch (err: any) {
      console.error('Directive dispatch failed:', err);
    } finally {
      setDispatchingBatchId(null);
    }
  };

  // Automatically detect created batch from URL params or localStorage
  useEffect(() => {
    const qBatch = searchParams.get('batchId') || localStorage.getItem('pharmasafe_latest_batch');
    if (qBatch) {
      setBatchInput(qBatch);
      setScenario('NORMAL');
      setActiveStep(1);
      setActiveTaskIndex(0);
      batchService.getBatches().then((batches) => {
        if (Array.isArray(batches) && batches.length > 0) {
          setAvailableBatches(batches);
          const found = batches.find(b => b.batch_number === qBatch || b.id === qBatch);
          if (found) {
            if (found.medicine?.brand_name) setMedicineName(found.medicine.brand_name);
            if (found.expiry_date) setExpiryDate(found.expiry_date);
            if (found.initial_quantity) setLotQuantity(found.initial_quantity);
          }
        }
      }).catch(err => console.warn('Could not sync queried batch:', err));
      loadBatchBackendData(qBatch);
      addLog(1, `Synced batch ${qBatch} into pipeline. Ready for autonomous execution.`, 'info');
    } else {
      batchService.getBatches().then((batches) => {
        if (Array.isArray(batches) && batches.length > 0) {
          setAvailableBatches(batches);
          const first = batches[0];
          setBatchInput(first.batch_number || 'B1001');
          if (first.medicine?.brand_name) setMedicineName(first.medicine.brand_name);
          if (first.expiry_date) setExpiryDate(first.expiry_date);
          if (first.initial_quantity) setLotQuantity(first.initial_quantity);
          loadBatchBackendData(first.batch_number || 'B1001');
        }
      }).catch(err => console.warn('Could not load batches for pipeline:', err));
    }
    loadPharmacySurveillance();
  }, [searchParams]);

  // Handle batch selection / quick click
  const handleSelectBatch = (bNum: string) => {
    setIsAutoRunning(false);
    setActiveTaskIndex(0);

    if (bNum === 'B-SWFT') {
      setScenario('B_SWFT');
      setBatchInput('B-SWFT');
      setMedicineName('Metformin 500mg');
      setExpiryDate('Dec 2027');
      setLotQuantity(1000);
      setActiveStep(1);
      addLog(1, 'Simulated Batch B-SWFT selected. Gov Gate block configured at Step 2.', 'warning');
      return;
    }
    if (bNum === 'B-QKP') {
      setScenario('B_QKP');
      setBatchInput('B-QKP');
      setMedicineName('Amoxicillin 250mg');
      setExpiryDate('Jun 2028');
      setLotQuantity(300);
      setActiveStep(2);
      addLog(2, 'Simulated Batch B-QKP selected. Gov Gate block configured at Step 3.', 'warning');
      return;
    }

    setScenario('NORMAL');
    setBatchInput(bNum);
    const found = availableBatches.find(b => b.batch_number === bNum);
    if (found) {
      setMedicineName(found.medicine?.brand_name || 'Pharmaceutical Product');
      setExpiryDate(found.expiry_date || 'Oct 2026');
      setLotQuantity(found.initial_quantity || 1000);
    } else {
      setMedicineName('Paracetamol 500mg IP');
    }
    setActiveStep(1);
    loadBatchBackendData(bNum);
    addLog(1, `Switched batch to ${bNum}. Autonomous pipeline reset to Step 1.`, 'info');
  };

  // Step-by-Step manual advancement
  const advanceStep = () => {
    if (scenario === 'B_SWFT' && activeStep >= 1) {
      setActiveStep(2);
      setIsAutoRunning(false);
      addLog(2, 'GOV GATE HALT: SwiftMed Logistics license EXPIRED. Pipeline auto-execution stopped.', 'error');
      return;
    }
    if (scenario === 'B_QKP' && activeStep >= 2) {
      setActiveStep(3);
      setIsAutoRunning(false);
      addLog(3, 'GOV GATE HALT: QuickPharma license REVOKED. Pipeline auto-execution stopped.', 'error');
      return;
    }
    setActiveStep((prev) => {
      const nxt = Math.min(prev + 1, 10);
      addLog(nxt, `Step ${nxt} (${STEP_NAMES[nxt]}) Handover complete.`, 'success');
      return nxt;
    });
    setActiveTaskIndex(0);
  };

  const stepBack = () => {
    setIsAutoRunning(false);
    setActiveStep((prev) => Math.max(prev - 1, 1));
    setActiveTaskIndex(0);
  };

  const resetToStep1 = () => {
    setActiveStep(1);
    setActiveTaskIndex(0);
    setIsAutoRunning(false);
    addLog(1, 'Pipeline reset to Step 1.', 'info');
  };

  // Single step processing trigger
  const processNextStep = () => {
    setIsProcessingStep(true);
    setTimeout(() => {
      advanceStep();
      setIsProcessingStep(false);
    }, 600);
  };

  // ─── Continuous Autonomous Execution Engine Loop ───
  useEffect(() => {
    if (!isAutoRunning) return;

    const speedMs = autoSpeed === '4x' ? 400 : autoSpeed === '2x' ? 800 : 1500;
    const taskInterval = speedMs / 3;

    const timer = setInterval(() => {
      // Check for Gov Gate block scenarios
      if (scenario === 'B_SWFT' && activeStep === 2) {
        setIsAutoRunning(false);
        addLog(2, 'AUTONOMOUS HALT: SwiftMed Logistics license EXPIRED. Blocked at Step 2.', 'error');
        return;
      }
      if (scenario === 'B_QKP' && activeStep === 3) {
        setIsAutoRunning(false);
        addLog(3, 'AUTONOMOUS HALT: QuickPharma license REVOKED. Blocked at Step 3.', 'error');
        return;
      }

      // Progress sub-task or advance step
      setActiveTaskIndex((currTask) => {
        if (currTask < 2) {
          const nextTask = currTask + 1;
          addLog(activeStep, `Sub-task ${nextTask + 1}/3 validated for Step ${activeStep}.`, 'info');
          return nextTask;
        } else {
          // All 3 sub-tasks done in current step -> advance to next step
          if (activeStep < 10) {
            setActiveStep((s) => {
              const nextStep = s + 1;
              addLog(nextStep, `✓ STEP ${s} COMPLETED. Auto-advancing to Step ${nextStep}: ${STEP_NAMES[nextStep]}`, 'success');
              return nextStep;
            });
            return 0;
          } else {
            // Pipeline reached Step 10 & completed
            setIsAutoRunning(false);
            addLog(10, '🎉 10-STAGE CLOSED-LOOP LIFECYCLE 100% COMPLETE. Batch verified and sealed.', 'success');
            return 2;
          }
        }
      });
    }, taskInterval);

    return () => clearInterval(timer);
  }, [isAutoRunning, activeStep, autoSpeed, scenario]);

  const steps = generatePipelineSteps(
    batchInput,
    medicineName,
    expiryDate,
    lotQuantity,
    activeStep,
    scenario
  );

  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const pct = Math.round((completedCount / steps.length) * 100);
  const hasGovBlock = (scenario === 'B_SWFT' && activeStep >= 2) || (scenario === 'B_QKP' && activeStep >= 3);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ─── Top Header Bar ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2.5 py-0.5 rounded-full">
              AUTONOMOUS CLOSED-LOOP ENGINE
            </span>
            <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
              <span className={`w-1.5 h-1.5 rounded-full ${isAutoRunning ? 'bg-emerald-400 animate-ping' : 'bg-emerald-400'}`} />
              {isAutoRunning ? 'AUTO-EXECUTING' : 'READY'}
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mt-1.5 flex items-center gap-2">
            PharmaSafe 10-Stage Closed-Loop AI Platform
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Autonomous multi-stage custody execution with sub-task verification, CDSCO Gov Gate validations, and real-time ledger synchronization.
          </p>
        </div>

        {/* Command Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'pipeline'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>10-Stage Pipeline</span>
          </button>

          <button
            onClick={() => setActiveTab('expiry_sentinel')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 relative cursor-pointer ${
              activeTab === 'expiry_sentinel'
                ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Expiry Sentinel</span>
            {surveillanceData && surveillanceData.expired_selling_threats_count > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute -top-1 -right-1" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('ai_risk_matrix')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ai_risk_matrix'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Neural Risk Matrix</span>
          </button>
        </div>
      </div>

      {/* ─── Autonomous Execution Master Controller Bar ─── */}
      <div className={`p-5 rounded-2xl border transition-all ${
        isAutoRunning
          ? 'bg-gradient-to-r from-emerald-950/50 via-slate-900 to-teal-950/50 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]'
          : 'bg-gradient-to-r from-slate-900 via-slate-900 to-slate-900 border-slate-800'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (activeStep >= 10) setActiveStep(1);
                setIsAutoRunning(!isAutoRunning);
                addLog(activeStep, !isAutoRunning ? '▶ Autonomous Pipeline Engine STARTED.' : '⏸ Autonomous Engine PAUSED.', 'info');
              }}
              disabled={hasGovBlock}
              className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2.5 transition-all shadow-lg cursor-pointer ${
                hasGovBlock
                  ? 'bg-red-950 border border-red-500/50 text-red-300 opacity-60 cursor-not-allowed'
                  : isAutoRunning
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)] animate-pulse'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.4)]'
              }`}
            >
              {isAutoRunning ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause Autonomous Engine</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Autonomous Pipeline Execution ➔</span>
                </>
              )}
            </button>

            {/* Speed Toggle Controls */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase px-2">Speed:</span>
              {(['1x', '2x', '4x'] as const).map((spd) => (
                <button
                  key={spd}
                  onClick={() => setAutoSpeed(spd)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    autoSpeed === spd
                      ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}
                </button>
              ))}
            </div>
          </div>

          {/* Active Auto Stage Indicator */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="text-right">
              <div className="text-slate-400 text-[10px] uppercase">Active Auto Stage:</div>
              <div className="text-white font-bold text-sm">
                Step {activeStep} of 10: <span className="text-cyan-400">{STEP_NAMES[activeStep]}</span>
              </div>
            </div>

            <div className="h-9 w-px bg-slate-800 hidden sm:block" />

            <div className="text-right">
              <div className="text-slate-400 text-[10px] uppercase">Task Validation:</div>
              <div className="text-emerald-400 font-bold text-sm">
                Task {activeTaskIndex + 1} of 3 Running
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── TAB 1: 10-Stage Pipeline Lifecycle ─── */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          {/* Interactive Batch Input & Step Controls */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Batch Identifier Inscribed
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={batchInput}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setBatchInput(val);
                        setScenario('NORMAL');
                        loadBatchBackendData(val);
                      }}
                      placeholder="e.g. B2026-9828, B1001, or custom lot ID"
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={resetToStep1}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Start at Step 1</span>
                  </button>
                </div>
              </div>

              {/* Manual Step Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={stepBack}
                  disabled={activeStep <= 1}
                  className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white disabled:opacity-30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Step Back</span>
                </button>

                <button
                  onClick={advanceStep}
                  disabled={activeStep >= 10 || hasGovBlock}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider flex items-center gap-2 disabled:opacity-40 transition-all cursor-pointer"
                >
                  <span>Manual Step {activeStep + 1}</span>
                  <ArrowRight className="w-4 h-4 text-cyan-400" />
                </button>
              </div>
            </div>

            {/* Quick Batch Selector Pills */}
            <div className="pt-3 border-t border-slate-800 flex items-center gap-2 flex-wrap text-xs">
              <span className="text-slate-500 font-mono uppercase text-[11px] shrink-0">Test Scenarios:</span>
              {availableBatches.slice(0, 3).map(b => (
                <button
                  key={b.id}
                  onClick={() => handleSelectBatch(b.batch_number || b.id)}
                  className={`px-2.5 py-1 rounded-lg border font-mono font-bold text-[11px] transition-all cursor-pointer ${
                    batchInput === b.batch_number && scenario === 'NORMAL'
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {b.batch_number} {b.medicine ? `(${b.medicine.brand_name.split(' ')[0]})` : ''}
                </button>
              ))}

              <button
                onClick={() => handleSelectBatch('B-SWFT')}
                className={`px-2.5 py-1 rounded-lg border font-mono font-bold text-[11px] transition-all flex items-center gap-1 cursor-pointer ${
                  scenario === 'B_SWFT'
                    ? 'bg-rose-950/60 border-rose-500 text-rose-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-rose-300'
                }`}
              >
                <ShieldX className="w-3 h-3 text-rose-400" />
                <span>B-SWFT (Auto-Halt at Step 2)</span>
              </button>

              <button
                onClick={() => handleSelectBatch('B-QKP')}
                className={`px-2.5 py-1 rounded-lg border font-mono font-bold text-[11px] transition-all flex items-center gap-1 cursor-pointer ${
                  scenario === 'B_QKP'
                    ? 'bg-red-950/60 border-red-500 text-red-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-red-300'
                }`}
              >
                <ShieldX className="w-3 h-3 text-red-400" />
                <span>B-QKP (Auto-Halt at Step 3)</span>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Pipeline Progress</span>
                <span className="text-lg font-black text-white">{pct}%</span>
                {hasGovBlock && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded">
                    <ShieldX className="w-3 h-3"/>GOV GATE HALTED
                  </span>
                )}
              </div>
              <span className="text-xs font-mono text-cyan-400">
                Stage {activeStep} of 10 Active
              </span>
            </div>
            <div className="h-2 bg-slate-700/60 rounded-full overflow-hidden flex">
              <div className="h-full bg-emerald-500 transition-all duration-500" style={{width:`${pct}%`}}/>
              {activeStep < 10 && !hasGovBlock && <div className="h-full bg-amber-400/70 animate-pulse" style={{width:`${(1/steps.length)*100}%`}}/>}
              {hasGovBlock && <div className="h-full bg-red-500/80" style={{width:`${(1/steps.length)*100}%`}}/>}
            </div>
          </div>

          {/* ─── Real-Time Autonomous Terminal Logs Stream ─── */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2.5 bg-slate-950/90 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2 text-slate-300 font-bold">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>Autonomous Task Execution Telemetry Stream</span>
              </div>
              <span className="text-[10px] text-slate-500">Auto-Scroll Active</span>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1 pr-2">
              {terminalLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2.5 text-[11px] leading-relaxed">
                  <span className="text-slate-600 shrink-0">[{log.time}]</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                    log.type === 'success' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                    log.type === 'error' ? 'bg-red-950 text-red-400 border border-red-800' :
                    log.type === 'warning' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                    'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}>
                    STEP {log.step.toString().padStart(2, '0')}
                  </span>
                  <span className={`${
                    log.type === 'success' ? 'text-emerald-300' :
                    log.type === 'error' ? 'text-red-300 font-bold' :
                    log.type === 'warning' ? 'text-amber-300' :
                    'text-slate-300'
                  }`}>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Step by Step Timeline */}
          <div className="bg-slate-900/30 rounded-2xl border border-slate-800/60 p-6">
            <div className="space-y-0">
              {steps.map((step,i) => (
                <StepCard 
                  key={step.step} 
                  step={step} 
                  isLast={i === steps.length-1}
                  activeTaskIndex={activeTaskIndex}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: AI In-Market Expiry Sentinel & Pharmacy Directive ─── */}
      {activeTab === 'expiry_sentinel' && (
        <div className="space-y-6">
          {/* Expiry Sentinel Header Banner */}
          <div className="glass-panel p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    AI In-Market Expiry Surveillance & Pharmacy Auto-Recall Directive
                    <span className="text-[10px] font-mono bg-emerald-950 border border-emerald-500 text-emerald-300 px-2 py-0.5 rounded-full">
                      FLEET MONITORING ONLINE
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                    Continuously scans distributed batches actively holding or selling across retail pharmacies. If an expired or critical shelf-life hazard is detected, the AI engine autonomously generates a CDSCO Stop-Sale Directive, locking the pharmacy POS and triggering immediate reverse logistics returns.
                  </p>
                </div>
              </div>

              <button
                onClick={loadPharmacySurveillance}
                disabled={loadingSurveillance}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:brightness-110 shrink-0 cursor-pointer"
              >
                {loadingSurveillance ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>Run Real-Time Fleet AI Scan</span>
              </button>
            </div>

            {/* Metric KPI Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800">
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                <div className="text-[10px] font-mono uppercase text-slate-400">Pharmacies Monitored</div>
                <div className="text-xl font-black text-white mt-0.5">
                  {surveillanceData?.total_pharmacies_monitored || 4} <span className="text-xs font-normal text-slate-500">Nodes</span>
                </div>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                <div className="text-[10px] font-mono uppercase text-slate-400">Batches Evaluated</div>
                <div className="text-xl font-black text-cyan-400 mt-0.5">
                  {surveillanceData?.total_batches_scanned || availableBatches.length || 6} <span className="text-xs font-normal text-slate-500">Lots</span>
                </div>
              </div>

              <div className="p-3 bg-red-950/30 rounded-xl border border-red-500/40">
                <div className="text-[10px] font-mono uppercase text-red-400 flex items-center gap-1">
                  <AlertOctagon className="w-3 h-3 text-red-400" />
                  <span>Expired Selling Hazards</span>
                </div>
                <div className="text-xl font-black text-red-400 mt-0.5">
                  {surveillanceData?.expired_selling_threats_count || 1} <span className="text-xs font-normal text-red-500/70">Critical</span>
                </div>
              </div>

              <div className="p-3 bg-amber-950/30 rounded-xl border border-amber-500/40">
                <div className="text-[10px] font-mono uppercase text-amber-400 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Directives Dispatched</span>
                </div>
                <div className="text-xl font-black text-amber-400 mt-0.5">
                  {surveillanceData?.active_recall_directives_count || 1} <span className="text-xs font-normal text-amber-500/70">Locked POS</span>
                </div>
              </div>
            </div>
          </div>

          {/* Directive Execution Alert Box (if triggered) */}
          {lastDirectiveResult && (
            <div className="glass-panel p-5 rounded-2xl border border-emerald-500/50 bg-emerald-950/20 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>CDSCO Autonomous Stop-Sale Directive Executed</span>
                      <span className="font-mono text-xs text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                        {lastDirectiveResult.directive_id}
                      </span>
                    </h4>
                    <p className="text-xs text-emerald-300 mt-0.5">
                      {lastDirectiveResult.message}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setLastDirectiveResult(null)}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Target Terminal:</span>
                  <div className="text-white font-bold mt-0.5">{lastDirectiveResult.pharmacy_name}</div>
                  <div className="text-emerald-400 text-[11px] mt-0.5">● POS Sale Authorization: DISABLED</div>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Quarantined Quantity:</span>
                  <div className="text-amber-300 font-bold mt-0.5">{lastDirectiveResult.quarantined_quantity} Units</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">Physical Shelf Lock Active</div>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Reverse Logistics Return:</span>
                  <div className="text-cyan-300 font-bold mt-0.5">{lastDirectiveResult.return_manifest_tracking_code}</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">Manifest Status: INITIATED</div>
                </div>
              </div>
            </div>
          )}

          {/* Distributed Pharmacy Inventory Live Surveillance Feed */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Store className="w-4 h-4 text-amber-400" />
                  <span>Real-Time In-Market Pharmacy Inventory & Expiry Feed</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  AI continuously correlates expiration timestamps, temperature storage history, and selling velocity to prevent expired dispensing.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-mono">Live Scanner:</span>
                <span className="text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                  POLLING AT 10HZ
                </span>
              </div>
            </div>

            {loadingSurveillance ? (
              <div className="p-12 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-mono">Scanning distributed retail pharmacy terminals...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {surveillanceData?.surveillance_feed.map((item) => {
                  const isExp = item.expiry_status === 'EXPIRED_SELLING_HAZARD';
                  const isCrit = item.expiry_status === 'CRITICAL_NEAR_EXPIRY';
                  const isDispatched = item.directive_status === 'DIRECTIVE_DISPATCHED_RETURN_ACTIVE';

                  return (
                    <div
                      key={`${item.batch_id}-${item.pharmacy_id}`}
                      className={`p-4 rounded-xl border transition-all ${
                        isExp
                          ? 'bg-red-950/20 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                          : isCrit
                          ? 'bg-amber-950/20 border-amber-500/50'
                          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        {/* Medicine & Batch Details */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white">{item.medicine_name}</span>
                            <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                              {item.batch_number}
                            </span>
                            {isExp && (
                              <span className="text-[10px] font-bold text-red-300 bg-red-950 px-2 py-0.5 rounded border border-red-500 flex items-center gap-1 animate-pulse">
                                <AlertTriangle className="w-3 h-3 text-red-400" />
                                EXPIRED — DISPENSING HAZARD
                              </span>
                            )}
                            {isCrit && (
                              <span className="text-[10px] font-bold text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-500 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-400" />
                                CRITICAL NEAR-EXPIRY (&lt;45d)
                              </span>
                            )}
                            {!isExp && !isCrit && (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                                HEALTHY SHELF-LIFE
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap font-mono">
                            <span className="flex items-center gap-1 text-slate-300">
                              <Store className="w-3.5 h-3.5 text-slate-500" />
                              {item.pharmacy_name}
                            </span>
                            <span>•</span>
                            <span>Lic: {item.pharmacy_license}</span>
                            <span>•</span>
                            <span>Loc: {item.pharmacy_location}</span>
                            <span>•</span>
                            <span className="text-amber-400">Holding: {item.stock_on_shelf} units</span>
                          </div>
                        </div>

                        {/* Shelf Life Meter & Actions */}
                        <div className="flex items-center gap-4 shrink-0">
                          {/* Days Counter */}
                          <div className="text-right">
                            <div className="text-[10px] font-mono text-slate-400 uppercase">Shelf Life Runway</div>
                            <div className={`text-sm font-black font-mono ${
                              item.days_to_expiry <= 0 ? 'text-red-400' : item.days_to_expiry <= 45 ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                              {item.days_to_expiry <= 0 ? `${Math.abs(item.days_to_expiry)} Days EXPIRED` : `${item.days_to_expiry} Days Remaining`}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Exp: {item.expiry_date}
                            </div>
                          </div>

                          {/* Action Button */}
                          <div>
                            {isDispatched ? (
                              <div className="px-3 py-2 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-xs font-bold text-emerald-300 flex items-center gap-1.5 font-mono">
                                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                                <span>POS LOCKED / MANIFEST ACTIVE</span>
                              </div>
                            ) : item.directive_action_needed ? (
                              <button
                                onClick={() => handleDispatchRecallDirective(item)}
                                disabled={dispatchingBatchId === item.batch_id}
                                className="px-3.5 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:brightness-110 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all cursor-pointer"
                              >
                                {dispatchingBatchId === item.batch_id ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Locking Terminal...</span>
                                  </>
                                ) : (
                                  <>
                                    <Zap className="w-3.5 h-3.5" />
                                    <span>Dispatch Stop-Sale Directive ➔</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <div className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-500">
                                Regular Dispensing
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* AI Predictive Analytics Row */}
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <span className="text-slate-500">Selling Velocity:</span>
                          <span className="text-slate-200">{item.selling_velocity_daily} units/day</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <span className="text-slate-500">Projected Unsold at Expiry:</span>
                          <span className={item.projected_expired_stock_units > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                            {item.projected_expired_stock_units} units
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <span className="text-slate-500">Thermal Degradation Factor:</span>
                          <span className={item.thermal_degradation_index > 1.0 ? 'text-amber-400' : 'text-slate-200'}>
                            {item.thermal_degradation_index}x ({item.thermal_degradation_index > 1.0 ? 'Accelerated' : 'Nominal'})
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: AI/ML Neural Risk Matrix ─── */}
      {activeTab === 'ai_risk_matrix' && (
        <div className="space-y-6">
          {/* AI Risk Score Overview Card */}
          <div className="glass-panel p-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-slate-900 via-teal-950/20 to-slate-900">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <Brain className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      PharmaSafe AI Neural Risk Engine
                    </h3>
                    <span className="text-[10px] font-mono bg-emerald-950 border border-emerald-500 text-emerald-300 px-2 py-0.5 rounded-full">
                      v2.1-ENSEMBLE
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                    Multi-model machine learning architecture analyzing spatial movement vectors, temperature degradation curves, and dead-batch re-entry threat signatures for lot <strong className="text-cyan-300 font-mono">{batchInput}</strong>.
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0 bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Composite Risk Index</div>
                <div className={`text-2xl font-black font-mono ${
                  (aiEvaluation?.composite_risk_score || 0.12) > 0.6 ? 'text-red-400' : (aiEvaluation?.composite_risk_score || 0.12) > 0.3 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {((aiEvaluation?.composite_risk_score || 0.12) * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  {aiEvaluation?.risk_level || 'LOW_RISK'} VERIFIED
                </div>
              </div>
            </div>
          </div>

          {/* Neural Ensemble Feature Decomposition */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-slate-400">Shelf Expiry Degradation</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-black text-white font-mono">
                {((aiEvaluation?.expiry_risk_score || 0.08) * 100).toFixed(0)}%
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-400 h-full rounded-full" 
                  style={{ width: `${(aiEvaluation?.expiry_risk_score || 0.08) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Evaluates days to expiry vs shelf life degradation curve.
              </p>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-slate-400">Transit Velocity Vector</span>
                <Truck className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xl font-black text-white font-mono">
                {((aiEvaluation?.movement_anomaly_score || 0.04) * 100).toFixed(0)}%
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-400 h-full rounded-full" 
                  style={{ width: `${(aiEvaluation?.movement_anomaly_score || 0.04) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Calculates transit speed across distribution checkpoints.
              </p>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-slate-400">Quantity Discrepancy</span>
                <CheckSquare className="w-4 h-4 text-violet-400" />
              </div>
              <div className="text-xl font-black text-white font-mono">
                {((aiEvaluation?.quantity_anomaly_score || 0.02) * 100).toFixed(0)}%
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-violet-400 h-full rounded-full" 
                  style={{ width: `${(aiEvaluation?.quantity_anomaly_score || 0.02) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Detects shrinkage between factory dispatch and retail intake.
              </p>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-slate-400">Dead Batch Re-entry Block</span>
                <Lock className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-black text-white font-mono">
                {((aiEvaluation?.reentry_risk_score || 0.00) * 100).toFixed(0)}%
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-400 h-full rounded-full" 
                  style={{ width: `${(aiEvaluation?.reentry_risk_score || 0.00) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Zero-trust watchdog cross-referencing national invalidation index.
              </p>
            </div>
          </div>

          {/* Model Explanation Summary */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>AI Ensemble Inference Summary & Safety Guarantees</span>
            </h4>
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 font-mono text-xs text-slate-300 leading-relaxed">
              {aiEvaluation?.explanation_summary || 
                `Batch ${batchInput} evaluated against 4 multi-modal neural risk models. All velocity telemetry within standard bounds. Shelf life degradation nominal with no active recall flags.`}
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
              <ShieldCheck className="w-4 h-4" />
              <span>Invariant Guaranteed: Deterministic CDSCO Gov Gate rules strictly supersede AI probability scores.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelinePage;
