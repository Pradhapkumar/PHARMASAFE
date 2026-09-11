import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Boxes, Clock, AlertTriangle, RotateCcw, Flame, 
  ShieldCheck, ShieldAlert, Cpu, ArrowRight, Activity,
  Truck, Building2, Pill, ShoppingCart, Search, FileText,
  PlusCircle, FolderSearch, Globe, CheckSquare, History,
  Sparkles, CheckCircle2, Scale, ExternalLink, RefreshCw,
  AlertOctagon
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import MetricCard from '../components/ui/MetricCard';
import AlertCard from '../components/ui/AlertCard';
import MetricTrendChart from '../components/charts/MetricTrendChart';
import LifecycleDonutChart from '../components/charts/LifecycleDonutChart';
import RiskDistributionChart from '../components/charts/RiskDistributionChart';
import { MOCK_ALERTS, MOCK_AUDIT_TRAIL, demoState } from '../mocks/mockData';
import { useAuth } from '../context/AuthContext';
import dashboardService, { DashboardMetrics } from '../services/dashboardService';
import { RoleType } from '../types/api';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const role: RoleType = currentUser?.role || 'MANUFACTURER';

  const [metrics, setMetrics] = useState<DashboardMetrics>({
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
  });

  useEffect(() => {
    dashboardService.getSummary().then(data => {
      if (data) setMetrics(data);
    });
  }, [role]);

  // Persona configurations
  const roleConfigs: Record<RoleType, {
    title: string;
    description: string;
    badge: string;
    badgeColor: string;
    org: string;
    quickActions: { label: string; to: string; icon: React.ReactNode; primary?: boolean }[];
    metrics: {
      title: string;
      value: string;
      subtext: string;
      change: string;
      trend: 'up' | 'down' | 'neutral';
      icon: React.ReactNode;
      accentColor: 'cyan' | 'emerald' | 'amber' | 'rose' | 'purple' | 'blue';
      onClick: () => void;
    }[];
  }> = {
    MANUFACTURER: {
      title: 'Manufacturer Production & Serialization Portal',
      description: 'Pharmaceutical manufacturing oversight, GS1 serialization, factory depot inventory, and outbound distribution logistics',
      badge: 'Manufacturer Node — Pfizer Healthcare India Ltd.',
      badgeColor: 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300',
      org: 'Pfizer Healthcare India Ltd. (Mumbai Plant)',
      quickActions: [
        { label: 'Register New Batch', to: '/batches/register', icon: <PlusCircle className="w-4 h-4" />, primary: true },
        { label: 'Factory Depot Inventory', to: '/manufacturer/inventory', icon: <Boxes className="w-4 h-4" /> },
        { label: 'Medicine Catalogue', to: '/medicines', icon: <Pill className="w-4 h-4" /> },
        { label: 'Master Batch B1001 Passport', to: '/batches/B1001', icon: <FileText className="w-4 h-4" /> },
      ],
      metrics: [
        {
          title: 'Active Manufactured Batches',
          value: metrics.activeBatches.toLocaleString(),
          subtext: 'Cataloged in serialization ledger',
          change: '+4.2% YoY',
          trend: 'up',
          icon: <Boxes className="w-5 h-5" />,
          accentColor: 'emerald',
          onClick: () => navigate('/batches/B1001'),
        },
        {
          title: 'Factory Inventory Stock',
          value: '45,000 Units',
          subtext: 'Ready for distributor dispatch',
          change: '9 Batches',
          trend: 'up',
          icon: <Boxes className="w-5 h-5" />,
          accentColor: 'cyan',
          onClick: () => navigate('/manufacturer/inventory'),
        },
        {
          title: 'Near Expiry (60 Days)',
          value: metrics.nearExpiryBatches.toLocaleString(),
          subtext: 'Proactive recall advisory window',
          change: 'Action Required',
          trend: 'up',
          icon: <Clock className="w-5 h-5" />,
          accentColor: 'amber',
          onClick: () => navigate('/expiry-intelligence'),
        },
        {
          title: 'Active Recall Alerts',
          value: `${metrics.recalledBatches} Batches`,
          subtext: 'Reverse logistics initiated',
          change: 'Mandatory Hold',
          trend: 'down',
          icon: <AlertTriangle className="w-5 h-5" />,
          accentColor: 'rose',
          onClick: () => navigate('/sales'),
        },
        {
          title: 'Reverse Inbound Returns',
          value: metrics.inTransitReturns.toLocaleString(),
          subtext: 'Incoming to manufacturer/disposal',
          change: 'Tracked lots',
          trend: 'neutral',
          icon: <RotateCcw className="w-5 h-5" />,
          accentColor: 'blue',
          onClick: () => navigate('/returns'),
        },
        {
          title: 'Certified Destroyed Lots',
          value: metrics.destroyedBatches.toLocaleString(),
          subtext: 'SHA-256 certificates logged',
          change: 'Permanent Closure',
          trend: 'up',
          icon: <ShieldCheck className="w-5 h-5" />,
          accentColor: 'purple',
          onClick: () => navigate('/dead-batches'),
        },
        {
          title: 'Tamper-Proof Serialization',
          value: '100.0%',
          subtext: 'GS1 Digital Link barcode integrity',
          change: 'PERFECT',
          trend: 'up',
          icon: <Sparkles className="w-5 h-5" />,
          accentColor: 'emerald',
          onClick: () => navigate('/medicines'),
        },
        {
          title: 'Compliance Index',
          value: `${metrics.complianceRate}%`,
          subtext: 'CDSCO manufacturing compliance',
          change: '+0.8%',
          trend: 'up',
          icon: <Activity className="w-5 h-5" />,
          accentColor: 'cyan',
          onClick: () => navigate('/compliance'),
        },
      ],
    },
    DISTRIBUTOR: {
      title: 'Distributor Logistics & Transit Operations Hub',
      description: 'Wholesale shipment receiving, digital custody handshakes, temperature-controlled transit, and retail pharmacy dispatches',
      badge: 'Distributor Hub — Apollo National Logistics',
      badgeColor: 'bg-amber-950/80 border-amber-500/40 text-amber-300',
      org: 'Apollo National Logistics (New Delhi Central Hub)',
      quickActions: [
        { label: 'Inbound Receiving Bay', to: '/distributor', icon: <Truck className="w-4 h-4" />, primary: true },
        { label: 'Dispatch to Pharmacy', to: '/distributor', icon: <Building2 className="w-4 h-4" /> },
        { label: 'Route Returns to Disposal', to: '/returns', icon: <RotateCcw className="w-4 h-4" /> },
        { label: 'Custody Handshake Log', to: '/chain-of-custody', icon: <History className="w-4 h-4" /> },
      ],
      metrics: [
        {
          title: 'Incoming Inbound Shipments',
          value: '3 Pending',
          subtext: 'Awaiting physical receiving count',
          change: 'From Sun / Pfizer',
          trend: 'neutral',
          icon: <Truck className="w-5 h-5" />,
          accentColor: 'amber',
          onClick: () => navigate('/distributor'),
        },
        {
          title: 'Hub Warehouse Inventory',
          value: '12,480 Units',
          subtext: 'Active stock across 6 medicines',
          change: 'Verified on-hand',
          trend: 'up',
          icon: <Boxes className="w-5 h-5" />,
          accentColor: 'cyan',
          onClick: () => navigate('/distributor'),
        },
        {
          title: 'Dispatched to Pharmacies',
          value: '4,200 Units',
          subtext: 'Transferred to retail network',
          change: '100% Signed',
          trend: 'up',
          icon: <Building2 className="w-5 h-5" />,
          accentColor: 'emerald',
          onClick: () => navigate('/distributor'),
        },
        {
          title: 'Reverse Returns in Transit',
          value: metrics.inTransitReturns.toLocaleString(),
          subtext: 'Pharmacy returns en route to hub',
          change: 'Quarantined stock',
          trend: 'neutral',
          icon: <RotateCcw className="w-5 h-5" />,
          accentColor: 'blue',
          onClick: () => navigate('/returns'),
        },
        {
          title: 'Flagged Discrepancies',
          value: '1 Lot (B1005)',
          subtext: '20 unit physical variance flagged',
          change: 'Under Review',
          trend: 'down',
          icon: <AlertTriangle className="w-5 h-5" />,
          accentColor: 'rose',
          onClick: () => navigate('/distributor'),
        },
        {
          title: 'Handshake Integrity',
          value: '99.4%',
          subtext: 'Signed digital custody receipts',
          change: '+0.4%',
          trend: 'up',
          icon: <ShieldCheck className="w-5 h-5" />,
          accentColor: 'emerald',
          onClick: () => navigate('/chain-of-custody'),
        },
        {
          title: 'Critical Custody Alerts',
          value: metrics.criticalAlertsUnread.toString(),
          subtext: 'Velocity & shrinkage exceptions',
          change: 'Urgent Action',
          trend: 'down',
          icon: <ShieldAlert className="w-5 h-5" />,
          accentColor: 'rose',
          onClick: () => navigate('/alerts'),
        },
        {
          title: 'Logistics SLA Rating',
          value: '98.2%',
          subtext: 'Reverse & forward chain speed',
          change: 'OPTIMAL',
          trend: 'up',
          icon: <Activity className="w-5 h-5" />,
          accentColor: 'purple',
          onClick: () => navigate('/compliance'),
        },
      ],
    },
    PHARMACY: {
      title: 'Pharmacy Operations & Dispensing Safety Terminal',
      description: 'Point-of-sale verification, automatic expiry/recall blocking, shelf inventory audits, and reverse return manifests',
      badge: 'Retail Pharmacy — MedPlus Central #104',
      badgeColor: 'bg-teal-950/80 border-teal-500/40 text-teal-300',
      org: 'MedPlus Central Pharmacy #104 (Bengaluru)',
      quickActions: [
        { label: 'Point-of-Sale Sale Check', to: '/sales', icon: <ShoppingCart className="w-4 h-4" />, primary: true },
        { label: 'Point-of-Care Barcode Scanner', to: '/verify', icon: <Search className="w-4 h-4" /> },
        { label: 'Pharmacy Operations Hub', to: '/pharmacy', icon: <Building2 className="w-4 h-4" /> },
        { label: 'Initiate Return Manifest', to: '/returns', icon: <RotateCcw className="w-4 h-4" /> },
      ],
      metrics: [
        {
          title: 'Daily POS Scans',
          value: '2,150 Scans',
          subtext: 'Patient dispensing checks',
          change: '+14% Volume',
          trend: 'up',
          icon: <ShoppingCart className="w-5 h-5" />,
          accentColor: 'emerald',
          onClick: () => navigate('/sales'),
        },
        {
          title: 'Authoritative Sale Blocks',
          value: `${metrics.reentryViolationsPrevented} Prevented`,
          subtext: 'Expired / Recalled / Dead batches',
          change: '100% Patient Safety',
          trend: 'up',
          icon: <AlertTriangle className="w-5 h-5" />,
          accentColor: 'rose',
          onClick: () => navigate('/sales'),
        },
        {
          title: 'Quarantined Shelf Stock',
          value: '12 Units (B1001)',
          subtext: 'Locked from point-of-sale',
          change: 'Return Initiated',
          trend: 'down',
          icon: <Clock className="w-5 h-5" />,
          accentColor: 'amber',
          onClick: () => navigate('/pharmacy'),
        },
        {
          title: 'Return Manifests In-Flight',
          value: '1 Manifest Active',
          subtext: 'Routed to GreenShield TSDF',
          change: 'TRK-REV-8831',
          trend: 'neutral',
          icon: <RotateCcw className="w-5 h-5" />,
          accentColor: 'blue',
          onClick: () => navigate('/returns'),
        },
        {
          title: 'Shelf Inventory Units',
          value: '3,850 Boxes',
          subtext: '100% Verified Authentic',
          change: 'Active stock',
          trend: 'up',
          icon: <Boxes className="w-5 h-5" />,
          accentColor: 'cyan',
          onClick: () => navigate('/pharmacy'),
        },
        {
          title: 'Dead Batch Intercepts',
          value: '3 Intercepts',
          subtext: 'Re-entry blocked at counter',
          change: 'CRITICAL SHIELD',
          trend: 'up',
          icon: <ShieldAlert className="w-5 h-5" />,
          accentColor: 'rose',
          onClick: () => navigate('/dead-batches'),
        },
        {
          title: 'Dispense Safety Score',
          value: '100.0%',
          subtext: 'Zero contaminated lots sold',
          change: 'PERFECT',
          trend: 'up',
          icon: <ShieldCheck className="w-5 h-5" />,
          accentColor: 'emerald',
          onClick: () => navigate('/compliance'),
        },
        {
          title: 'Pharmacist Audit Trail',
          value: '99.8%',
          subtext: '21 CFR Part 11 compliant logs',
          change: 'AUDITED',
          trend: 'up',
          icon: <Activity className="w-5 h-5" />,
          accentColor: 'purple',
          onClick: () => navigate('/audit'),
        },
      ],
    },
    DISPOSAL_FACILITY: {
      title: 'Authorized Bio-Hazard Disposal Operations Terminal',
      description: 'Controlled intake, scale weight reconciliation, 1200°C incineration, and SHA-256 destruction certificate issuance',
      badge: 'TSDF Facility — GreenShield Bio-Hazard Incinerator',
      badgeColor: 'bg-purple-950/80 border-purple-500/40 text-purple-300',
      org: 'GreenShield Bio-Hazard Incinerator (Zone 4, Hyderabad)',
      quickActions: [
        { label: 'Bio-Hazard Disposal Intake', to: '/disposal', icon: <Flame className="w-4 h-4" />, primary: true },
        { label: 'Scale Weight Intake Log', to: '/disposal', icon: <Scale className="w-4 h-4" /> },
        { label: 'Issue Destruction Certificate', to: '/certificates', icon: <ShieldCheck className="w-4 h-4" /> },
        { label: 'Dead Batch Registry', to: '/dead-batches', icon: <FolderSearch className="w-4 h-4" /> },
      ],
      metrics: [
        {
          title: 'Inbound Return Lots',
          value: `${metrics.awaitingDisposal} Batches`,
          subtext: 'Awaiting thermal destruction',
          change: 'Intake Queued',
          trend: 'neutral',
          icon: <RotateCcw className="w-5 h-5" />,
          accentColor: 'amber',
          onClick: () => navigate('/disposal'),
        },
        {
          title: 'Scale-Verified Mass',
          value: '425.8 kg Total',
          subtext: 'Digital scale weight intake check',
          change: '98.9% Match',
          trend: 'up',
          icon: <Scale className="w-5 h-5" />,
          accentColor: 'cyan',
          onClick: () => navigate('/disposal'),
        },
        {
          title: 'Certified Disposed Batches',
          value: metrics.destroyedBatches.toLocaleString(),
          subtext: '1200°C Thermal destruction complete',
          change: 'Disposed Status',
          trend: 'up',
          icon: <Flame className="w-5 h-5" />,
          accentColor: 'rose',
          onClick: () => navigate('/disposal'),
        },
        {
          title: 'Issued SHA-256 Certificates',
          value: metrics.destroyedBatches.toLocaleString(),
          subtext: 'Cryptographically signed certs',
          change: '100% Inscribed',
          trend: 'up',
          icon: <ShieldCheck className="w-5 h-5" />,
          accentColor: 'purple',
          onClick: () => navigate('/certificates'),
        },
        {
          title: 'Dead Batch Inscriptions',
          value: `${metrics.deadBatchesInRegistry} Inscribed`,
          subtext: 'Permanently blacklisted lots',
          change: 'Write-Once',
          trend: 'up',
          icon: <ShieldAlert className="w-5 h-5" />,
          accentColor: 'emerald',
          onClick: () => navigate('/dead-batches'),
        },
        {
          title: 'Weight Variance Rate',
          value: '0.4%',
          subtext: 'Shipped vs. scale-received weight',
          change: 'PASS',
          trend: 'up',
          icon: <Activity className="w-5 h-5" />,
          accentColor: 'blue',
          onClick: () => navigate('/disposal'),
        },
        {
          title: 'Hash Integrity Rate',
          value: '100.0%',
          subtext: 'Zero tampered certificates',
          change: 'PERFECT',
          trend: 'up',
          icon: <Sparkles className="w-5 h-5" />,
          accentColor: 'emerald',
          onClick: () => navigate('/certificates'),
        },
        {
          title: 'TSDF Compliance Score',
          value: '99.2%',
          subtext: 'CPCB bio-hazard environmental audit',
          change: 'OPTIMAL',
          trend: 'up',
          icon: <CheckSquare className="w-5 h-5" />,
          accentColor: 'cyan',
          onClick: () => navigate('/compliance'),
        },
      ],
    },
    REGULATOR_AUDITOR: {
      title: 'National Regulatory Inspectorate & Safety Oversight',
      description: 'Sovereign Dead Batch Registry monitoring, anti-re-entry enforcement, online marketplace surveillance, and forensic cases',
      badge: 'Regulatory Authority — CDSCO Central Drug Authority',
      badgeColor: 'bg-blue-950/80 border-blue-500/40 text-blue-300',
      org: 'CDSCO Central Drug Regulatory Authority (New Delhi)',
      quickActions: [
        { label: 'Sovereign Dead Batch Registry', to: '/dead-batches', icon: <ShieldAlert className="w-4 h-4 text-rose-400" />, primary: true },
        { label: 'Forensic Investigation Dossiers', to: '/investigations', icon: <FolderSearch className="w-4 h-4 text-amber-400" /> },
        { label: 'In-Market Expiry AI Sentinel', to: '/pipeline', icon: <Clock className="w-4 h-4 text-amber-400" /> },
        { label: 'Executive Analytics & Index', to: '/analytics', icon: <Activity className="w-4 h-4" /> },
      ],
      metrics: [
        {
          title: 'Sovereign Dead Batches',
          value: `${metrics.deadBatchesInRegistry} Batches`,
          subtext: 'Permanently inscribed in registry',
          change: 'Cryptographically sealed',
          trend: 'up',
          icon: <ShieldAlert className="w-5 h-5" />,
          accentColor: 'rose',
          onClick: () => navigate('/dead-batches'),
        },
        {
          title: 'Re-Entry Attempts Blocked',
          value: `${metrics.reentryViolationsPrevented} Violations`,
          subtext: 'Scans of destroyed medicines halted',
          change: 'National Sentinel Active',
          trend: 'up',
          icon: <AlertTriangle className="w-5 h-5" />,
          accentColor: 'rose',
          onClick: () => navigate('/re-entry'),
        },
        {
          title: 'In-Market Expiry Surveillance',
          value: '4 Pharmacy Nodes',
          subtext: 'Real-time shelf-life tracking',
          change: 'Auto-Stop Sale Active',
          trend: 'up',
          icon: <Clock className="w-5 h-5" />,
          accentColor: 'amber',
          onClick: () => navigate('/pipeline'),
        },
        {
          title: 'Active Forensic Dossiers',
          value: '4 Open Cases',
          subtext: 'INV-2026-B1001 Master Case',
          change: 'Priority Investigation',
          trend: 'down',
          icon: <FolderSearch className="w-5 h-5" />,
          accentColor: 'amber',
          onClick: () => navigate('/investigations'),
        },
        {
          title: 'SHA-256 Hash Integrity',
          value: '100.0%',
          subtext: 'Destruction certificate verification',
          change: 'ZERO TAMPERING',
          trend: 'up',
          icon: <ShieldCheck className="w-5 h-5" />,
          accentColor: 'emerald',
          onClick: () => navigate('/certificates'),
        },
        {
          title: 'Sale Blocking Enforcement',
          value: '100.0%',
          subtext: 'Deterministic PoS safety lock',
          change: 'INVIOLABLE',
          trend: 'up',
          icon: <CheckCircle2 className="w-5 h-5" />,
          accentColor: 'cyan',
          onClick: () => navigate('/sales'),
        },
        {
          title: 'Critical Unresolved Alerts',
          value: metrics.criticalAlertsUnread.toString(),
          subtext: 'Requires inspector review',
          change: 'Action Required',
          trend: 'down',
          icon: <AlertOctagon className="w-5 h-5" />,
          accentColor: 'rose',
          onClick: () => navigate('/alerts'),
        },
        {
          title: 'National Compliance Score',
          value: `${metrics.complianceRate}%`,
          subtext: '8-dimension regulatory index',
          change: 'OPTIMAL (98.7%)',
          trend: 'up',
          icon: <Activity className="w-5 h-5" />,
          accentColor: 'emerald',
          onClick: () => navigate('/compliance'),
        },
      ],
    },
    ADMIN: {
      title: 'PharmaSafe Central Operations Command Center',
      description: 'Master platform telemetry, multi-tenant RBAC administration, AI risk anomaly engine, and sovereign ledger integrity',
      badge: 'System Admin — PharmaSafe Security Operations',
      badgeColor: 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300',
      org: 'PharmaSafe Security Operations & Sentinel Hub',
      quickActions: [
        { label: 'AI Risk Intelligence Hub', to: '/ai-risk', icon: <Cpu className="w-4 h-4 text-cyan-400" />, primary: true },
        { label: 'Executive Analytics', to: '/analytics', icon: <Activity className="w-4 h-4" /> },
        { label: 'Audit Trail Ledger', to: '/audit', icon: <History className="w-4 h-4" /> },
        { label: 'Incident Sentinel', to: '/alerts', icon: <ShieldAlert className="w-4 h-4" /> },
      ],
      metrics: [
        {
          title: 'Total Active Batches',
          value: metrics.activeBatches.toLocaleString(),
          subtext: 'Across all registered manufacturers',
          change: '+4.2% YoY',
          trend: 'up',
          icon: <Boxes className="w-5 h-5" />,
          accentColor: 'emerald',
          onClick: () => navigate('/batches/B1001'),
        },
        {
          title: 'Near Expiry (60 Days)',
          value: metrics.nearExpiryBatches.toLocaleString(),
          subtext: 'Automated quarantine countdown',
          change: '+12 units',
          trend: 'up',
          icon: <Clock className="w-5 h-5" />,
          accentColor: 'amber',
          onClick: () => navigate('/expiry-intelligence'),
        },
        {
          title: 'Expired / Recalled',
          value: (metrics.expiredBatches + metrics.recalledBatches).toLocaleString(),
          subtext: 'Point-of-Sale locked',
          change: `${metrics.recalledBatches} Recall lots`,
          trend: 'down',
          icon: <AlertTriangle className="w-5 h-5" />,
          accentColor: 'rose',
          onClick: () => navigate('/sales'),
        },
        {
          title: 'Reverse In Transit',
          value: metrics.inTransitReturns.toLocaleString(),
          subtext: 'Verified custody handshakes',
          change: '98.2% on-route',
          trend: 'up',
          icon: <RotateCcw className="w-5 h-5" />,
          accentColor: 'blue',
          onClick: () => navigate('/returns'),
        },
        {
          title: 'Awaiting Disposal',
          value: metrics.awaitingDisposal.toLocaleString(),
          subtext: 'At GreenShield bio-facility',
          change: 'Inspection queued',
          trend: 'neutral',
          icon: <Flame className="w-5 h-5" />,
          accentColor: 'purple',
          onClick: () => navigate('/disposal'),
        },
        {
          title: 'Destroyed (Dead Registry)',
          value: metrics.destroyedBatches.toLocaleString(),
          subtext: 'Cryptographic SHA-256 certs',
          change: `${metrics.deadBatchesInRegistry} in ledger`,
          trend: 'up',
          icon: <ShieldCheck className="w-5 h-5" />,
          accentColor: 'emerald',
          onClick: () => navigate('/dead-batches'),
        },
        {
          title: 'Compliance Score',
          value: `${metrics.complianceRate}%`,
          subtext: 'CDSCO mandate audit index',
          change: '+0.8%',
          trend: 'up',
          icon: <Activity className="w-5 h-5" />,
          accentColor: 'cyan',
          onClick: () => navigate('/compliance'),
        },
        {
          title: 'Critical Alerts',
          value: metrics.criticalAlertsUnread.toString(),
          subtext: 'Re-entry & custody breaches',
          change: 'Urgent Action',
          trend: 'down',
          icon: <ShieldAlert className="w-5 h-5" />,
          accentColor: 'rose',
          onClick: () => navigate('/alerts'),
        },
      ],
    },
  };

  const currentConfig = roleConfigs[role] || roleConfigs.MANUFACTURER;

  // Mock Trend Datasets
  const trendData = [
    { name: 'Apr', value: 120, secondaryValue: 14 },
    { name: 'May', value: 190, secondaryValue: 28 },
    { name: 'Jun', value: 160, secondaryValue: 22 },
    { name: 'Jul', value: 240, secondaryValue: 35 },
    { name: 'Aug', value: 310, secondaryValue: 48 },
    { name: 'Sep', value: 380, secondaryValue: 62 },
  ];

  const lifecycleData = [
    { name: 'Active In Supply', value: metrics.activeBatches, color: '#10b981' },
    { name: 'Near Expiry (60d)', value: metrics.nearExpiryBatches, color: '#f59e0b' },
    { name: 'Expired / Recall', value: metrics.expiredBatches + metrics.recalledBatches, color: '#f43f5e' },
    { name: 'In Reverse Transit', value: metrics.inTransitReturns, color: '#3b82f6' },
    { name: 'Destroyed (Dead)', value: metrics.destroyedBatches, color: '#8b5cf6' },
  ];

  const riskData = [
    { category: 'Low Risk', count: 11850, color: '#10b981' },
    { category: 'Medium Risk', count: 520, color: '#f59e0b' },
    { category: 'High Risk', count: 180, color: '#f97316' },
    { category: 'Critical Alert', count: demoState.reentryDetected ? metrics.criticalAlertsUnread + 1 : metrics.criticalAlertsUnread, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      {/* Persona Header */}
      <PageHeader
        title={currentConfig.title}
        description={currentConfig.description}
        badge={
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold border ${currentConfig.badgeColor}`}>
            {currentConfig.badge}
          </span>
        }
        actions={
          <button
            onClick={() => navigate('/verify')}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            <span>Scan & Verify Medicine</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        }
      />

      {/* Role Quick-Action Launchpad Banner */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900/90 to-slate-950/90">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>{role.replace('_', ' ')} WORKSPACE</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono">
                {currentConfig.org}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Quick launch workflows customized for your authorized role permissions</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {currentConfig.quickActions.map((qa, i) => (
            <button
              key={i}
              onClick={() => navigate(qa.to)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                qa.primary
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)] hover:brightness-110'
                  : 'bg-slate-900 border border-slate-700 text-slate-200 hover:border-slate-600 hover:bg-slate-800'
              }`}
            >
              {qa.icon}
              <span>{qa.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Role-Tailored 8 Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {currentConfig.metrics.map((m, idx) => (
          <MetricCard
            key={idx}
            title={m.title}
            value={m.value}
            subtext={m.subtext}
            change={m.change}
            trend={m.trend}
            icon={m.icon}
            accentColor={m.accentColor}
            onClick={m.onClick}
          />
        ))}
      </div>

      {/* Primary Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expiry & Return Trends Chart */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Reverse Supply Velocity & Expiry Trajectory
              </h3>
              <p className="text-xs text-slate-400">Monthly units transitioned into reverse logistics return chain</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span>Expired Stock</span>
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span>Reverse Inbound</span>
              </span>
            </div>
          </div>
          <MetricTrendChart
            data={trendData}
            primaryLabel="Expired Stock"
            secondaryLabel="Reverse Inbound"
            primaryColor="#06b6d4"
            secondaryColor="#f43f5e"
            height={260}
          />
        </div>

        {/* Lifecycle Donut Breakdown */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
            Batch Status Distribution
          </h3>
          <p className="text-xs text-slate-400 mb-4">Overall active registry breakdown</p>
          <LifecycleDonutChart data={lifecycleData} height={220} />
        </div>
      </div>

      {/* Secondary Row: Live Incident Sentinel & AI Risk Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Critical Alerts Panel */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Sentinel Incident Feed ({role.replace('_', ' ')})</span>
              </h3>
              <p className="text-xs text-slate-400">Real-time alerts triggered by surveillance and scanner logs</p>
            </div>
            <button
              onClick={() => navigate('/alerts')}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:underline"
            >
              View All Alerts
            </button>
          </div>

          <div className="space-y-3">
            {MOCK_ALERTS.slice(0, 2).map(alert => (
              <AlertCard
                key={alert.id}
                {...alert}
                onViewDetails={bNum => navigate(bNum ? `/batches/${bNum}` : '/re-entry')}
              />
            ))}
          </div>
        </div>

        {/* AI Risk Score Distribution */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>AI Risk Distribution</span>
            </h3>
            <button
              onClick={() => navigate('/ai-risk')}
              className="text-xs text-cyan-400 hover:underline font-medium"
            >
              Model Details
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-4">Evaluated across supply anomaly & dead registry vectors</p>
          <RiskDistributionChart data={riskData} height={200} />
        </div>
      </div>

      {/* Recent Supply Chain Movements Table */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Immutable Custody Audit Log (Recent Events)
            </h3>
            <p className="text-xs text-slate-400">Cryptographically signed transitions recorded on ledger</p>
          </div>
          <button
            onClick={() => navigate('/audit')}
            className="text-xs font-semibold text-cyan-400 hover:underline"
          >
            Full Audit Trail
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 font-mono">
            <thead className="bg-slate-900/80 uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Actor / Entity</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Batch ID</th>
                <th className="py-2.5 px-3">Result</th>
                <th className="py-2.5 px-3">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {MOCK_AUDIT_TRAIL.slice(0, 4).map(evt => (
                <tr key={evt.id} className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-mono text-slate-400">{evt.timestamp}</td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-white">{evt.user}</div>
                    <div className="text-[10px] text-slate-400">{evt.organization}</div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-cyan-400 font-semibold">{evt.action}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-white">{evt.entityId}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                      evt.result === 'SUCCESS' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' :
                      evt.result === 'WARNING' ? 'bg-amber-950 text-amber-400 border border-amber-800/50' :
                      'bg-rose-950 text-rose-400 border border-rose-800/50'
                    }`}>
                      {evt.result}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-xs text-slate-300 max-w-xs truncate">{evt.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
