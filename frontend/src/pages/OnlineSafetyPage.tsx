import React, { useState, useEffect, useMemo } from 'react';
import { 
  Globe, ShieldAlert, CheckCircle2, XCircle, AlertTriangle, ExternalLink, Ban, 
  Search, RefreshCw, Play, ShieldCheck, FileText, ChevronRight, Info, AlertOctagon, 
  Flame, Lock, Eye, Check, X, SlidersHorizontal, Sparkles, Send
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import MetricCard from '../components/ui/MetricCard';
import Modal from '../components/ui/Modal';
import Drawer from '../components/ui/Drawer';
import apiClient from '../services/apiClient';
import { 
  OnlineMedicineListing, OnlineSafetySummary, ListingVerificationRequest, 
  ListingVerificationResponse, StageCheckResult, ListingVerificationDecision, 
  RiskLevel 
} from '../types/api';

export const OnlineSafetyPage: React.FC = () => {
  // State for surveillance data
  const [listings, setListings] = useState<OnlineMedicineListing[]>([]);
  const [summary, setSummary] = useState<OnlineSafetySummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filters
  const [decisionFilter, setDecisionFilter] = useState<'ALL' | 'ALLOW' | 'REVIEW' | 'BLOCK'>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sandbox Modal State
  const [isSandboxOpen, setIsSandboxOpen] = useState<boolean>(false);
  const [sandboxEvaluating, setSandboxEvaluating] = useState<boolean>(false);
  const [sandboxResult, setSandboxResult] = useState<ListingVerificationResponse | null>(null);
  const [sandboxSaving, setSandboxSaving] = useState<boolean>(false);
  const [sandboxSavedMessage, setSandboxSavedMessage] = useState<string | null>(null);

  // Sandbox Form Data
  const [formData, setFormData] = useState<ListingVerificationRequest>({
    platform_name: 'Apollo 24|7 Digital',
    seller_name: 'Apex Care Dispensary Ltd',
    seller_license_number: 'DL-2024-PH-9921',
    claimed_product_name: 'Amoxicillin 500mg',
    batch_number: 'PH9-SAFE-BATCH-001',
    offered_quantity: 40,
    listed_price_inr: 135,
    listing_url: 'https://apollo247.example.com/item/amx-ph9',
    claimed_certificate_hash: '',
    claimed_qr_payload: '',
  });

  // Inspection Drawer State
  const [selectedListing, setSelectedListing] = useState<OnlineMedicineListing | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Load summary and listings from real backend
  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumRes, listRes] = await Promise.all([
        apiClient.getOnlineSafetySummary().catch(() => null),
        apiClient.getOnlineListings({ limit: 100 }).catch(() => []),
      ]);
      if (sumRes) setSummary(sumRes);
      if (listRes) setListings(listRes);
    } catch (err) {
      console.error('Failed to load online safety data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Listings
  const filteredListings = useMemo(() => {
    return listings.filter(item => {
      if (decisionFilter !== 'ALL' && item.verification_decision !== decisionFilter) return false;
      if (riskFilter !== 'ALL' && item.risk_level !== riskFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchBatch = item.batch_number?.toLowerCase().includes(query);
        const matchMedicine = item.claimed_product_name?.toLowerCase().includes(query);
        const matchSeller = item.seller_name?.toLowerCase().includes(query);
        const matchPlatform = item.platform_name?.toLowerCase().includes(query);
        if (!matchBatch && !matchMedicine && !matchSeller && !matchPlatform) return false;
      }
      return true;
    });
  }, [listings, decisionFilter, riskFilter, searchQuery]);

  // Handle Enforcement Actions (ISSUE_TAKEDOWN | CONFIRM_BLOCK | APPROVE_PERMITTED)
  const handleEnforce = async (listingId: string, action: 'ISSUE_TAKEDOWN' | 'CONFIRM_BLOCK' | 'APPROVE_PERMITTED') => {
    setActionLoadingId(listingId);
    try {
      const updated = await apiClient.enforceOnlineListingAction(
        listingId,
        action,
        `Enforced via PharmaSafe Compliance Command Center by authorized officer`
      );
      // Update local state
      setListings(prev => prev.map(l => (l.id === listingId ? updated : l)));
      if (selectedListing && selectedListing.id === listingId) {
        setSelectedListing(updated);
      }
      // Refresh summary
      const sumRes = await apiClient.getOnlineSafetySummary().catch(() => null);
      if (sumRes) setSummary(sumRes);
    } catch (err: any) {
      alert(`Enforcement failed: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Run 11-Stage Verification in Sandbox
  const handleRunSandboxVerification = async () => {
    setSandboxEvaluating(true);
    setSandboxSavedMessage(null);
    try {
      const res = await apiClient.verifyOnlineListing(formData);
      setSandboxResult(res);
    } catch (err: any) {
      alert(`Verification error: ${err.message}`);
    } finally {
      setSandboxEvaluating(false);
    }
  };

  // Save Sandbox Listing to Monitored Database
  const handleSaveSandboxListing = async () => {
    setSandboxSaving(true);
    setSandboxSavedMessage(null);
    try {
      const newListing = await apiClient.createOnlineListing(formData);
      setSandboxSavedMessage(`Listing inscribed to registry (Ref: ${newListing.listing_reference}) with decision ${newListing.verification_decision}`);
      await fetchData();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSandboxSaving(false);
    }
  };

  // Sandbox Presets
  const applyPreset = (presetKey: string) => {
    setSandboxResult(null);
    setSandboxSavedMessage(null);
    switch (presetKey) {
      case 'SAFE_PHARMACY':
        setFormData({
          platform_name: 'MedPlus Mart Digital',
          seller_name: 'MedPlus Central Pharmacy #104',
          seller_license_number: 'LIC-RET-KA-2022-7719',
          claimed_product_name: 'Amoxil 500mg',
          batch_number: 'AMX-2026-001',
          offered_quantity: 40,
          listed_price_inr: 125,
          listing_url: 'https://medplusmart.com/item/amoxil-500',
          claimed_certificate_hash: '',
          claimed_qr_payload: '',
        });
        break;

      case 'DEAD_BATCH_COLLISION':
        setFormData({
          platform_name: 'DarkRx Telegram Channel',
          seller_name: 'Direct Pharma Liquidators',
          seller_license_number: 'UNVERIFIED-TELEGRAM-01',
          claimed_product_name: 'Amoxil 500mg',
          batch_number: 'AMX-2024-DEAD-01',
          offered_quantity: 100,
          listed_price_inr: 35,
          listing_url: 'https://t.me/darkrx_deals/post/9941',
          claimed_certificate_hash: '',
          claimed_qr_payload: '',
        });
        break;

      case 'EXPIRED_BATCH':
        setFormData({
          platform_name: 'IndieMeds Clearance',
          seller_name: 'Discount Health Corner',
          seller_license_number: 'DL-2022-EXP-552',
          claimed_product_name: 'Azithral 250',
          batch_number: 'AZT-2025-EXP',
          offered_quantity: 50,
          listed_price_inr: 90,
          listing_url: 'https://indiemeds.in/item/azt-clearance',
          claimed_certificate_hash: '',
          claimed_qr_payload: '',
        });
        break;

      case 'RECALLED_BATCH':
        setFormData({
          platform_name: 'Tata 1mg Open Marketplace',
          seller_name: 'Sunrise Medi Distributors',
          seller_license_number: 'DL-2024-REC-711',
          claimed_product_name: 'Remdec 100mg',
          batch_number: 'RMD-2026-REC',
          offered_quantity: 25,
          listed_price_inr: 155,
          listing_url: 'https://1mg.example.com/pharma/rmd-deal',
          claimed_certificate_hash: '',
          claimed_qr_payload: '',
        });
        break;

      case 'STOLEN_CERT_HASH':
        setFormData({
          platform_name: 'NetMeds Third-Party Storefront',
          seller_name: 'MedPlus Central Pharmacy #104',
          seller_license_number: 'LIC-RET-KA-2022-7719',
          claimed_product_name: 'Amoxil 500mg',
          batch_number: 'AMX-2026-001',
          offered_quantity: 30,
          listed_price_inr: 125,
          listing_url: 'https://netmeds.example.com/store/medplus-amx',
          claimed_certificate_hash: '43714b59fdb4d2732b330b004718e058e30f99a6ae6329a07eb0eb680fd18a01',
          claimed_qr_payload: '',
        });
        break;
    }
  };

  const getDecisionBadge = (decision: ListingVerificationDecision | string) => {
    switch (decision) {
      case 'ALLOW':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wider bg-emerald-950/60 border border-emerald-500/50 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            ALLOW
          </span>
        );
      case 'REVIEW':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wider bg-amber-950/60 border border-amber-500/50 text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            REVIEW
          </span>
        );
      case 'BLOCK':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wider bg-rose-950/80 border border-rose-500/60 text-rose-300">
            <XCircle className="w-3.5 h-3.5" />
            BLOCK
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-slate-800 text-slate-300 border border-slate-700">
            {decision}
          </span>
        );
    }
  };

  const getStageStatusBadge = (status: 'PASSED' | 'WARNING' | 'FAILED' | string) => {
    switch (status) {
      case 'PASSED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 uppercase">
            <Check className="w-3 h-3" /> PASSED
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/70 border border-amber-500/40 text-amber-300 uppercase">
            <AlertTriangle className="w-3 h-3" /> WARNING
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950/70 border border-rose-500/40 text-rose-300 uppercase">
            <X className="w-3 h-3" /> FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400 uppercase">
            {status}
          </span>
        );
    }
  };

  // Helper to convert stage_checks dict to array
  const getStageList = (stageChecks?: Record<string, StageCheckResult>) => {
    if (!stageChecks) return [];
    return Object.entries(stageChecks).map(([key, val], idx) => ({
      key,
      index: idx + 1,
      stage: val.stage || key,
      status: val.status,
      details: val.details,
    }));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <PageHeader
        title="Online Medicine Safety & Marketplace Verification"
        description="Deterministic 11-Stage Verification Engine Auditing Digital Dispensaries, Marketplace Sellers & Grey-Market Diverted Medicines"
        badge={
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            Marketplace Safety Sentinel v1.0
          </span>
        }
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setIsSandboxOpen(true);
                setSandboxResult(null);
                setSandboxSavedMessage(null);
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>11-Stage Verification Sandbox</span>
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              title="Refresh Surveillance Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        }
      />

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        <MetricCard
          title="Monitored Listings"
          value={summary?.total_evaluated_listings ?? listings.length}
          subtext="Audited across web & channels"
          accentColor="cyan"
          icon={<Globe className="w-4 h-4" />}
        />
        <MetricCard
          title="Permitted (ALLOW)"
          value={summary?.allowed_count ?? listings.filter(l => l.verification_decision === 'ALLOW').length}
          subtext="Passed all safety checks"
          accentColor="emerald"
          icon={<ShieldCheck className="w-4 h-4" />}
        />
        <MetricCard
          title="Under Review"
          value={summary?.review_count ?? listings.filter(l => l.verification_decision === 'REVIEW').length}
          subtext="Manual compliance review"
          accentColor="amber"
          icon={<AlertTriangle className="w-4 h-4" />}
        />
        <MetricCard
          title="Blocked Listings"
          value={summary?.blocked_count ?? listings.filter(l => l.verification_decision === 'BLOCK').length}
          subtext="High-risk / dangerous batches"
          accentColor="rose"
          icon={<AlertOctagon className="w-4 h-4" />}
        />
        <MetricCard
          title="Takedowns Issued"
          value={summary?.takedowns_issued ?? listings.filter(l => l.takedown_requested).length}
          subtext="Notice served to ISP/host"
          accentColor="purple"
          icon={<Ban className="w-4 h-4" />}
        />
      </div>

      {/* Filter and Search Navigation Bar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 bg-slate-900/50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Decision Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          {(['ALL', 'ALLOW', 'REVIEW', 'BLOCK'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setDecisionFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all ${
                decisionFilter === tab
                  ? tab === 'ALLOW'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/50 shadow-sm'
                    : tab === 'REVIEW'
                    ? 'bg-amber-950 text-amber-300 border border-amber-600/50 shadow-sm'
                    : tab === 'BLOCK'
                    ? 'bg-rose-950 text-rose-300 border border-rose-600/50 shadow-sm'
                    : 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {tab === 'ALL' ? 'All Surveillance' : tab}
              <span className="ml-1.5 text-[10px] opacity-70 font-mono">
                (
                {tab === 'ALL'
                  ? listings.length
                  : listings.filter(l => l.verification_decision === tab).length}
                )
              </span>
            </button>
          ))}
        </div>

        {/* Search & Risk Controls */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search batch, seller, product..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <select
            value={riskFilter}
            onChange={e => setRiskFilter(e.target.value)}
            className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>
      </div>

      {/* Surveillance Listings Feed */}
      {filteredListings.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center">
          <Globe className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-white mb-1">No Online Listings In Feed</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-5">
            No marketplace listings match the selected criteria. Use the 11-Stage Verification Sandbox to evaluate and register new online listings directly into the surveillance ledger.
          </p>
          <button
            onClick={() => setIsSandboxOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-slate-950 inline-flex items-center gap-2"
          >
            <Play className="w-3.5 h-3.5" />
            Launch Verification Sandbox
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredListings.map(item => {
            const isCritical = item.verification_decision === 'BLOCK' || item.risk_level === 'CRITICAL' || item.risk_score >= 0.8;
            const isTakenDown = item.takedown_requested;

            return (
              <div
                key={item.id}
                className={`glass-panel p-5 rounded-2xl border transition-all duration-200 ${
                  isCritical
                    ? 'border-red-500/40 bg-red-950/15 shadow-[0_0_25px_rgba(239,68,68,0.1)]'
                    : item.verification_decision === 'REVIEW'
                    ? 'border-amber-500/30 bg-amber-950/10'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3 mb-3.5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl border ${
                        item.verification_decision === 'ALLOW'
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-600/30'
                          : item.verification_decision === 'REVIEW'
                          ? 'bg-amber-950/60 text-amber-400 border-amber-600/30'
                          : 'bg-rose-950/60 text-rose-400 border-rose-600/30'
                      }`}
                    >
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">{item.platform_name}</span>
                        {getDecisionBadge(item.verification_decision)}
                        <StatusBadge status={item.listing_status} size="sm" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span>Seller: <strong className="text-slate-300">{item.seller_name}</strong></span>
                        {item.seller_license_number && (
                          <span className="font-mono text-[11px] bg-slate-800/60 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700/50">
                            {item.seller_license_number}
                          </span>
                        )}
                        <span className="text-slate-500 font-mono text-[10px]">Ref: {item.listing_reference}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price & Quantity Overview */}
                  <div className="text-left sm:text-right flex sm:flex-col items-center sm:items-end justify-between gap-2">
                    <div>
                      <span className="text-xs text-slate-400">Listed Price: </span>
                      <strong className="text-sm text-white font-mono">₹{item.listed_price_inr?.toFixed(2) || 'N/A'}</strong>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      Quantity: <strong className="text-cyan-400">{item.offered_quantity || 1} units</strong>
                    </div>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 text-xs">
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Claimed Product</span>
                    <strong className="text-white text-xs block truncate">{item.claimed_product_name}</strong>
                  </div>
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Batch Number</span>
                    <strong className="text-cyan-400 font-mono text-xs block">{item.batch_number || 'UNSPECIFIED'}</strong>
                  </div>
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Risk Assessment</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`font-mono font-bold text-xs ${
                          item.risk_score >= 0.8
                            ? 'text-rose-400'
                            : item.risk_score >= 0.4
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {Math.round(item.risk_score * 100)} / 100
                      </span>
                      <StatusBadge status={item.risk_level} size="sm" />
                    </div>
                  </div>
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Enforcement Status</span>
                    <strong className="text-slate-300 font-mono text-xs block truncate">
                      {isTakenDown ? 'TAKEDOWN DEMAND SENT' : item.listing_status}
                    </strong>
                  </div>
                </div>

                {/* Reason Banner */}
                {item.decision_reasons && item.decision_reasons.length > 0 && (
                  <div className="my-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 leading-relaxed flex items-start gap-2">
                    <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-mono text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                        Verification Rationale:
                      </span>
                      {item.decision_reasons.join('; ')}
                    </div>
                  </div>
                )}

                {/* Footer Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    {item.takedown_requested && (
                      <span className="text-[11px] font-mono bg-purple-950/80 border border-purple-600/50 text-purple-300 px-2 py-0.5 rounded">
                        Takedown Requested
                      </span>
                    )}
                    {item.listing_url && (
                      <a
                        href={item.listing_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1"
                      >
                        <span>Listing Evidence</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Details Drawer */}
                    <button
                      onClick={() => {
                        setSelectedListing(item);
                        setIsDrawerOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      <span>11-Stage Audit</span>
                    </button>

                    {/* Quick Enforcement Action Buttons */}
                    {item.verification_decision === 'BLOCK' && !isTakenDown && (
                      <button
                        onClick={() => handleEnforce(item.id, 'ISSUE_TAKEDOWN')}
                        disabled={actionLoadingId === item.id}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>{actionLoadingId === item.id ? 'Processing...' : 'Issue ISP Takedown'}</span>
                      </button>
                    )}

                    {item.verification_decision === 'REVIEW' && item.listing_status !== 'BLOCKED' && !isTakenDown && (
                      <button
                        onClick={() => handleEnforce(item.id, 'CONFIRM_BLOCK')}
                        disabled={actionLoadingId === item.id}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <AlertOctagon className="w-3.5 h-3.5" />
                        <span>{actionLoadingId === item.id ? 'Processing...' : 'Confirm Block'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── 11-STAGE VERIFICATION SANDBOX MODAL ─────────────────────────── */}
      <Modal
        isOpen={isSandboxOpen}
        onClose={() => setIsSandboxOpen(false)}
        title="11-Stage Online Medicine Listing Verification Sandbox"
        subtitle="Simulate and test marketplace listings against the sovereign regulatory engine before permitting or blocking sales"
        maxWidth="2xl"
      >
        <div className="space-y-5 text-xs text-slate-300">
          {/* Preset Buttons */}
          <div>
            <label className="text-[11px] font-mono text-slate-400 uppercase font-semibold block mb-2">
              Select Test Scenarios (Fast Presets):
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset('SAFE_PHARMACY')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-950/70 border border-emerald-600/40 text-emerald-300 hover:bg-emerald-900/60 transition-colors cursor-pointer"
              >
                🟢 Safe Dispensary Batch
              </button>
              <button
                type="button"
                onClick={() => applyPreset('DEAD_BATCH_COLLISION')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-950/70 border border-red-600/40 text-red-300 hover:bg-red-900/60 transition-colors cursor-pointer"
              >
                🔴 Dead Batch Re-Entry (B1001)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('EXPIRED_BATCH')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-orange-950/70 border border-orange-600/40 text-orange-300 hover:bg-orange-900/60 transition-colors cursor-pointer"
              >
                🟠 Expired Batch
              </button>
              <button
                type="button"
                onClick={() => applyPreset('RECALLED_BATCH')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/70 border border-rose-600/40 text-rose-300 hover:bg-rose-900/60 transition-colors cursor-pointer"
              >
                ⚠️ Recalled Batch
              </button>
              <button
                type="button"
                onClick={() => applyPreset('STOLEN_CERT_HASH')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-950/70 border border-purple-600/40 text-purple-300 hover:bg-purple-900/60 transition-colors cursor-pointer"
              >
                🚨 Stolen SHA-256 Cert Hash
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Platform Name</label>
              <input
                type="text"
                value={formData.platform_name}
                onChange={e => setFormData({ ...formData, platform_name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Seller Name</label>
              <input
                type="text"
                value={formData.seller_name}
                onChange={e => setFormData({ ...formData, seller_name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Seller License Number</label>
              <input
                type="text"
                placeholder="e.g. DL-2024-PH-9921"
                value={formData.seller_license_number || ''}
                onChange={e => setFormData({ ...formData, seller_license_number: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Claimed Product / Brand Name</label>
              <input
                type="text"
                value={formData.claimed_product_name}
                onChange={e => setFormData({ ...formData, claimed_product_name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Batch Number</label>
              <input
                type="text"
                value={formData.batch_number || ''}
                onChange={e => setFormData({ ...formData, batch_number: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Offered Quantity</label>
              <input
                type="number"
                value={formData.offered_quantity || 1}
                onChange={e => setFormData({ ...formData, offered_quantity: parseInt(e.target.value) || 1 })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Claimed Price (INR ₹)</label>
              <input
                type="number"
                value={formData.listed_price_inr || ''}
                onChange={e => setFormData({ ...formData, listed_price_inr: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Listing URL / Channel Link</label>
              <input
                type="text"
                value={formData.listing_url || ''}
                onChange={e => setFormData({ ...formData, listing_url: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-slate-400 font-medium mb-1">Claimed Destruction Certificate Hash (Optional)</label>
              <input
                type="text"
                placeholder="64-character SHA-256 hash if fraudulent certificate claimed"
                value={formData.claimed_certificate_hash || ''}
                onChange={e => setFormData({ ...formData, claimed_certificate_hash: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleRunSandboxVerification}
              disabled={sandboxEvaluating}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 fill-slate-950" />
              <span>{sandboxEvaluating ? 'Evaluating 11 Stages...' : 'Evaluate 11 Verification Stages'}</span>
            </button>

            {sandboxResult && (
              <button
                type="button"
                onClick={handleSaveSandboxListing}
                disabled={sandboxSaving}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-cyan-400" />
                <span>{sandboxSaving ? 'Saving...' : 'Register to Surveillance Feed'}</span>
              </button>
            )}
          </div>

          {/* Saved Notification */}
          {sandboxSavedMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{sandboxSavedMessage}</span>
            </div>
          )}

          {/* Live 11-Stage Verification Results Banner */}
          {sandboxResult && (
            <div className="mt-4 space-y-4 pt-4 border-t border-slate-800 animate-in fade-in">
              {/* Verdict Header Banner */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  sandboxResult.decision === 'ALLOW'
                    ? 'bg-emerald-950/50 border-emerald-500/50'
                    : sandboxResult.decision === 'REVIEW'
                    ? 'bg-amber-950/50 border-amber-500/50'
                    : 'bg-rose-950/50 border-rose-500/50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono uppercase text-slate-400">Deterministic Verdict:</span>
                    {getDecisionBadge(sandboxResult.decision)}
                    <StatusBadge status={sandboxResult.risk_level} size="sm" />
                  </div>
                  <h4 className="text-sm font-bold text-white">{sandboxResult.summary}</h4>
                  {sandboxResult.decision_reasons && sandboxResult.decision_reasons.length > 0 && (
                    <p className="text-xs text-slate-300/80 mt-1">
                      Reasons: <strong className="text-white">{sandboxResult.decision_reasons.join(', ')}</strong>
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Risk Score</span>
                  <span
                    className={`text-2xl font-bold font-mono ${
                      sandboxResult.risk_score >= 0.8
                        ? 'text-rose-400'
                        : sandboxResult.risk_score >= 0.4
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {Math.round(sandboxResult.risk_score * 100)} / 100
                  </span>
                </div>
              </div>

              {/* 11-Stage Progression Breakdown */}
              <div>
                <h5 className="text-xs font-mono uppercase font-semibold text-slate-400 mb-2.5">
                  11-Stage Verification Sequence:
                </h5>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {getStageList(sandboxResult.stage_checks).map(stage => (
                    <div
                      key={stage.key}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                        stage.status === 'PASSED'
                          ? 'bg-slate-900/60 border-slate-800'
                          : stage.status === 'WARNING'
                          ? 'bg-amber-950/20 border-amber-800/40'
                          : 'bg-rose-950/30 border-rose-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-mono font-bold text-slate-300 shrink-0">
                          {stage.index}
                        </span>
                        <div className="min-w-0">
                          <span className="font-semibold text-white block text-xs truncate">
                            {stage.stage}
                          </span>
                          <span className="text-[11px] text-slate-400 block truncate">
                            {stage.details}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {getStageStatusBadge(stage.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ─── 11-STAGE AUDIT REPORT DRAWER ─────────────────────────────────── */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Online Listing Audit Dossier"
        subtitle={`Ref: ${selectedListing?.listing_reference || selectedListing?.id.slice(0, 8)}`}
        width="lg"
      >
        {selectedListing && (
          <div className="space-y-5 text-xs text-slate-300">
            {/* Verdict Header */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-slate-400 uppercase">System Decision</span>
                {getDecisionBadge(selectedListing.verification_decision)}
              </div>
              <p className="text-xs font-semibold text-white mb-2">
                {selectedListing.decision_reasons && selectedListing.decision_reasons.length > 0
                  ? selectedListing.decision_reasons.join('; ')
                  : 'Evaluated against PharmaSafe sovereign compliance gates.'}
              </p>
              <div className="flex items-center gap-2 text-xs">
                <StatusBadge status={selectedListing.risk_level} size="sm" />
                <span className="font-mono text-slate-400">Risk Score: {Math.round(selectedListing.risk_score * 100)}/100</span>
                <StatusBadge status={selectedListing.listing_status} size="sm" />
              </div>
            </div>

            {/* Listing Attributes */}
            <div className="space-y-2">
              <h5 className="text-[11px] font-mono uppercase text-slate-400 font-semibold">Listing Metadata</h5>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Platform</span>
                  <span className="font-semibold text-white">{selectedListing.platform_name}</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Seller</span>
                  <span className="font-semibold text-white">{selectedListing.seller_name}</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Batch Number</span>
                  <span className="font-mono text-cyan-400">{selectedListing.batch_number || 'N/A'}</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Claimed Product</span>
                  <span className="font-semibold text-white">{selectedListing.claimed_product_name}</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Offered Quantity</span>
                  <span className="font-semibold text-cyan-400">{selectedListing.offered_quantity || 1} units</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Unit Price</span>
                  <span className="font-semibold text-white">₹{selectedListing.listed_price_inr?.toFixed(2) || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Stage Audit Results */}
            {selectedListing.stage_checks && (
              <div className="space-y-2">
                <h5 className="text-[11px] font-mono uppercase text-slate-400 font-semibold">11-Stage Inspection Log</h5>
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {getStageList(selectedListing.stage_checks).map(st => (
                    <div
                      key={st.key}
                      className={`p-2.5 rounded-lg border text-xs ${
                        st.status === 'PASSED'
                          ? 'bg-slate-950/60 border-slate-800'
                          : st.status === 'WARNING'
                          ? 'bg-amber-950/30 border-amber-800/40'
                          : 'bg-rose-950/40 border-rose-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white text-xs">
                          {st.index}. {st.stage}
                        </span>
                        {getStageStatusBadge(st.status)}
                      </div>
                      <p className="text-[11px] text-slate-300">{st.details}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Enforcement Log */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <h5 className="text-[11px] font-mono uppercase text-slate-400 font-semibold">Regulatory Enforcement State</h5>
              <div className="text-xs text-slate-300 space-y-1">
                <div>Status: <strong className="text-white">{selectedListing.listing_status}</strong></div>
                <div>Takedown Requested: <strong className={selectedListing.takedown_requested ? 'text-rose-400' : 'text-slate-400'}>
                  {selectedListing.takedown_requested ? 'YES' : 'NO'}
                </strong></div>
                {selectedListing.takedown_requested_at && (
                  <div>Takedown Timestamp: <span className="font-mono text-slate-400">{new Date(selectedListing.takedown_requested_at).toLocaleString()}</span></div>
                )}
                {selectedListing.enforcement_notes && (
                  <div>Notes: <span className="text-cyan-300">{selectedListing.enforcement_notes}</span></div>
                )}
              </div>

              {/* Quick Enforcement Trigger Buttons */}
              {!selectedListing.takedown_requested && selectedListing.verification_decision === 'BLOCK' && (
                <button
                  onClick={() => handleEnforce(selectedListing.id, 'ISSUE_TAKEDOWN')}
                  disabled={actionLoadingId === selectedListing.id}
                  className="w-full mt-2 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Ban className="w-4 h-4" />
                  <span>Issue Legal ISP Takedown Now</span>
                </button>
              )}

              {selectedListing.verification_decision === 'REVIEW' && selectedListing.listing_status !== 'BLOCKED' && (
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => handleEnforce(selectedListing.id, 'CONFIRM_BLOCK')}
                    disabled={actionLoadingId === selectedListing.id}
                    className="flex-1 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Confirm Block</span>
                  </button>
                  <button
                    onClick={() => handleEnforce(selectedListing.id, 'APPROVE_PERMITTED')}
                    disabled={actionLoadingId === selectedListing.id}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve Permitted</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default OnlineSafetyPage;
