import React from 'react';
import { 
  Boxes, ShieldCheck, Truck, Store, Flame, 
  RotateCcw, MapPin, CheckCircle2, User, Clock, ArrowRight 
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';

export const ChainOfCustodyPage: React.FC = () => {
  const custodySteps = [
    {
      stepNumber: '01',
      stage: 'MANUFACTURING ORIGIN',
      org: 'Pfizer Healthcare India Ltd.',
      location: 'Kurla Plant #2, Mumbai, Maharashtra (19.0760° N, 72.8777° E)',
      actor: 'Dr. Rajesh Sharma (Director of QA)',
      action: 'Batch Synthesis & Cryptographic Seal Issued',
      timestamp: '2024-03-15 10:30 UTC',
      quantity: '1,000 Boxes (Lot B1001)',
      icon: <Boxes className="w-6 h-6 text-cyan-400" />,
      verified: true,
      signature: 'SIG-MFG-9981-SHA256:4a8b...19e0',
    },
    {
      stepNumber: '02',
      stage: 'PRIMARY WHOLESALE LOGISTICS',
      org: 'Apollo National Distribution Hub',
      location: 'Transport Nagar, Sector 18, New Delhi (28.6139° N, 77.2090° E)',
      actor: 'Vikram Sethi (Wholesale Depot Mgr)',
      action: 'Inbound Barcode Handshake & Cold-Chain Acceptance',
      timestamp: '2024-03-18 14:15 UTC',
      quantity: '1,000 Boxes Verified (0 Discrepancy)',
      icon: <Truck className="w-6 h-6 text-blue-400" />,
      verified: true,
      signature: 'SIG-DST-8812-SHA256:7c2e...88b1',
    },
    {
      stepNumber: '03',
      stage: 'POINT-OF-CARE DISPENSARY',
      org: 'MedPlus Central Pharmacy #104',
      location: '100 Feet Rd, Indiranagar, Bengaluru, Karnataka (12.9716° N, 77.5946° E)',
      actor: 'Ananya Iyer, R.Ph. (Supervising Pharmacist)',
      action: 'Shelf Receiving & Optical Verification Scan',
      timestamp: '2024-03-22 11:45 UTC',
      quantity: '1,000 Boxes Authenticated',
      icon: <Store className="w-6 h-6 text-emerald-400" />,
      verified: true,
      signature: 'SIG-PHARM-7719-SHA256:9f4d...31a4',
    },
    {
      stepNumber: '04',
      stage: 'REVERSE LOGISTICS DISPATCH',
      org: 'MedPlus Central Pharmacy #104',
      location: 'Indiranagar, Bengaluru -> Reverse Carrier',
      actor: 'Ananya Iyer, R.Ph.',
      action: 'Quarantine Protocol Engaged (Stated Expiry Passed)',
      timestamp: '2024-09-02 10:00 UTC',
      quantity: '1,000 Boxes (Quarantine Manifest TRK-REV-0891)',
      icon: <RotateCcw className="w-6 h-6 text-amber-400" />,
      verified: true,
      signature: 'SIG-REV-0091-SHA256:1a7b...44c2',
    },
    {
      stepNumber: '05',
      stage: 'CERTIFIED REVERSE TRANSIT',
      org: 'Apollo Reverse Logistics Carrier Fleet',
      location: 'Highway Corridor MH-TS (Transit Route)',
      actor: 'Carrier Lead Sunil Joshi (Badge #CR-441)',
      action: 'Secure Tamper-Evident GPS-Tracked Fleet Transit',
      timestamp: '2024-09-04 08:30 UTC',
      quantity: '1,000 Boxes Sealed Pallet',
      icon: <Truck className="w-6 h-6 text-blue-400" />,
      verified: true,
      signature: 'SIG-FLEET-441-SHA256:3d9a...66e5',
    },
    {
      stepNumber: '06',
      stage: 'AUTHORIZED BIO-HAZARD DISPOSAL',
      org: 'GreenShield Bio-Hazard Incineration Facility',
      location: 'Biomedical Disposal Zone 4, Hyderabad, Telangana (17.3850° N, 78.4867° E)',
      actor: 'Captain David Thomas & Insp. Rajiv Verma (FDA Witness)',
      action: 'High-Temperature Incineration & Dead Registry Blacklist',
      timestamp: '2024-09-06 14:00 UTC',
      quantity: '1,000 Boxes Demolished at 1200°C',
      icon: <Flame className="w-6 h-6 text-purple-400" />,
      verified: true,
      signature: 'SHA256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visual Chain of Custody & Multi-Party Handshake Graph"
        description="Unbroken forward and reverse cryptographic custody trail tracking Batch B1001 from pharmaceutical synthesis to verified thermal destruction"
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
            Cryptographically Verified Trail
          </span>
        }
      />

      {/* Visual Chain Progression Graph */}
      <div className="space-y-6">
        {custodySteps.map((step, idx) => (
          <div key={idx} className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-xl font-black font-mono text-cyan-400">
                  {step.stepNumber}
                </span>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/80 shadow-inner">
                  {step.icon}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-slate-400">
                    {step.stage}
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">{step.org}</h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-semibold font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>CUSTODY VERIFIED</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500 uppercase font-mono text-[10px] flex items-center gap-1 mb-0.5">
                  <User className="w-3 h-3 text-slate-400" />
                  <span>Authorized Signer</span>
                </span>
                <strong className="text-slate-200 block truncate">{step.actor}</strong>
              </div>

              <div>
                <span className="text-slate-500 uppercase font-mono text-[10px] flex items-center gap-1 mb-0.5">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>Geographic Location</span>
                </span>
                <strong className="text-slate-200 block truncate">{step.location}</strong>
              </div>

              <div>
                <span className="text-slate-500 uppercase font-mono text-[10px] flex items-center gap-1 mb-0.5">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Handshake Timestamp</span>
                </span>
                <strong className="text-slate-200 font-mono block">{step.timestamp}</strong>
              </div>

              <div>
                <span className="text-slate-500 uppercase font-mono text-[10px] flex items-center gap-1 mb-0.5">
                  <Boxes className="w-3 h-3 text-slate-400" />
                  <span>Verified Units</span>
                </span>
                <strong className="text-cyan-300 font-mono block">{step.quantity}</strong>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono">
              <div className="text-slate-400">
                <span>Action: </span>
                <span className="text-white font-medium">{step.action}</span>
              </div>
              <div className="text-slate-500 truncate max-w-sm">
                <span>Sig: </span>
                <span className="text-cyan-400 font-semibold">{step.signature}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChainOfCustodyPage;
