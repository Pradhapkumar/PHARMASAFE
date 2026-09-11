import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, Skull, AlertTriangle, ExternalLink, 
  CheckCircle2, Ban, Eye, Sparkles, Activity 
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import { demoState } from '../mocks/mockData';

export const ReentryDetectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [isBlocked, setIsBlocked] = useState(false);
  const [isReviewed, setIsReviewed] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automated Re-Entry Intelligence Sentinel"
        description="Continuous neural surveillance correlating point-of-sale optical scans and gray marketplace listings against the Dead Batch Registry"
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-red-950/80 border border-red-500/50 text-red-400 animate-pulse">
            🚨 Active Threat Sentinel Engaged
          </span>
        }
      />

      {/* Critical Threat Callout Card (Batch B1001) */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border-2 border-red-500/50 bg-red-950/20 shadow-[0_0_35px_rgba(239,68,68,0.2)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-red-900/60 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-red-900/40 text-red-400 border border-red-700/60 animate-pulse">
              <Skull className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase text-red-400 tracking-wider">
                  Incident ID: RE-ENTRY-SENTINEL-0904
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-900 text-white uppercase">
                  CONFIDENCE: 98%
                </span>
              </div>
              <h2 className="text-xl font-black text-white mt-1">
                Possible Market Re-Entry Detected: Batch B1001
              </h2>
              <p className="text-xs text-red-300/80 mt-0.5">
                Activity intercepted on gray market e-commerce platform matching certified destroyed stock.
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-3xl font-black font-mono text-red-400 block">98%</span>
            <span className="text-[10px] font-mono uppercase text-slate-400">Composite Risk Score</span>
          </div>
        </div>

        {/* Explainable AI Risk Attribution Breakdown */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-3">
            Algorithmic Threat Attribution & Explainable Risk Factors
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <strong className="text-white">1. Inscribed in Dead Registry</strong>
                <span className="text-red-400 font-mono font-bold text-[11px]">+45% Weight</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Batch B1001 was officially certified as destroyed at GreenShield Incineration Facility (Hash: e3b0c442...). Physical existence in market indicates diversion or counterfeit repackaging.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <strong className="text-white">2. Deep Price Deviation (-75%)</strong>
                <span className="text-red-400 font-mono font-bold text-[11px]">+25% Weight</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Offered at ₹120 vs wholesale MRP ₹480. Extreme unverified discount is a primary statistical marker of stolen, expired, or illicit salvaged stock.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <strong className="text-white">3. Unregistered Channel Seller</strong>
                <span className="text-red-400 font-mono font-bold text-[11px]">+18% Weight</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Seller &apos;FastMeds_Wholesale&apos; lacks CDSCO Form 20/21 wholesale drug licensure. Operating via encrypted peer-to-peer distribution channel.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <strong className="text-white">4. Exact Identifier Correlation</strong>
                <span className="text-red-400 font-mono font-bold text-[11px]">+10% Weight</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                OCR and listing text analysis extracted string &apos;B1001&apos; matching authentic manufacturer lot typography.
              </p>
            </div>
          </div>
        </div>

        {/* Responsible AI Transparency Note */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            <strong>Transparency Notice:</strong> System algorithmically flags high-risk probability of re-entry. Human regulatory review is required prior to legal prosecution.
          </span>
        </div>

        {/* Action Controls */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-red-900/60">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setIsBlocked(true);
                alert('Takedown and legal freeze order transmitted to CDSCO cyber-cell.');
              }}
              disabled={isBlocked}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                isBlocked
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  : 'bg-rose-500 text-slate-950 hover:bg-rose-400 shadow-lg cursor-pointer'
              }`}
            >
              <Ban className="w-4 h-4" />
              <span>{isBlocked ? 'Listing Blocked & Frozen' : 'Issue Immediate Takedown & Freeze'}</span>
            </button>

            <button
              onClick={() => {
                setIsReviewed(true);
                alert('Flagged for priority state inspector field review.');
              }}
              className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white text-xs font-semibold"
            >
              {isReviewed ? '✓ Review Queued' : 'Flag for Inspector Field Review'}
            </button>
          </div>

          <button
            onClick={() => navigate('/batches/B1001')}
            className="text-xs font-semibold text-cyan-400 hover:underline flex items-center gap-1"
          >
            <span>Inspect Batch Passport (B1001)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReentryDetectionPage;
