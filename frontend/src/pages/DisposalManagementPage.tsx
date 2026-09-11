import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Flame, Scale, CheckCircle2, ShieldAlert, Camera, 
  FileCheck, ArrowRight, UserCheck, Sparkles, Check
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import disposalService, { DisposalIntakeItem } from '../services/disposalService';
import returnService from '../services/returnService';
import { ReturnRequest } from '../types/api';
import { demoState } from '../mocks/mockData';

export const DisposalManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [intakeItems, setIntakeItems] = useState<DisposalIntakeItem[]>([]);
  const [liveReturns, setLiveReturns] = useState<ReturnRequest[]>([]);
  const [selectedItem, setSelectedItem] = useState<DisposalIntakeItem | null>(null);
  const [showDisposalModal, setShowDisposalModal] = useState(false);
  const [lastDisposedBatch, setLastDisposedBatch] = useState<string | null>(null);

  // Form states
  const [batchNumber, setBatchNumber] = useState('B1001');
  const [quantity, setQuantity] = useState(1000);
  const [method, setMethod] = useState('HIGH_TEMP_INCINERATION_1200C');
  const [operatorNotes, setOperatorNotes] = useState('Pre-treatment chemical denaturation followed by 1200°C primary thermal destruction.');
  const [scaleWeightKg, setScaleWeightKg] = useState('45.5');

  const loadData = async () => {
    const items = await disposalService.getIntakeItems();
    setIntakeItems(items);

    try {
      const returns = await returnService.getReturns();
      setLiveReturns(returns);
    } catch (err) {
      console.warn('Error fetching live returns:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [demoState.isB1001Returned, demoState.isB1001Destroyed]);

  const handleExecuteDisposal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await disposalService.recordDisposalAndComplete({
        batch_number: batchNumber,
        quantity: Number(quantity),
        method,
        notes: operatorNotes,
        scale_weight_kg: scaleWeightKg,
      });
      setLastDisposedBatch(batchNumber);
      setShowDisposalModal(false);
      loadData();
    } catch (err: any) {
      alert(`Error recording operational disposal: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Authorized Bio-Hazard Disposal Operations"
        description="Controlled physical processing and operational disposal of expired, contaminated, and recalled pharmaceutical stock"
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-purple-950/60 border border-purple-500/40 text-purple-300">
            GreenShield Incineration Facility (Zone 4)
          </span>
        }
        actions={
          <button
            onClick={() => setShowDisposalModal(true)}
            className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-rose-600 text-white text-xs font-bold hover:brightness-110 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
          >
            <Flame className="w-4 h-4" />
            <span>Execute Operational Disposal</span>
          </button>
        }
      />

      {/* Destruction Certification Handoff Banner if Disposal Completed */}
      {lastDisposedBatch && (
        <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-800/60 text-purple-200 text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <strong className="text-white block font-mono text-sm">
                Facility Disposal Logged for {lastDisposedBatch} — Status: DISPOSED
              </strong>
              <span className="text-purple-300">
                Inbound disposal registered. Stock ready for Certified Destruction Record & Dead Batch Registry inscription.
              </span>
            </div>
          </div>
          <Link
            to="/certificates"
            className="px-3.5 py-2 rounded-lg bg-purple-900 border border-purple-700 text-white font-bold hover:bg-purple-800 transition-colors shrink-0 flex items-center gap-1.5"
          >
            <span>Proceed to Destruction Certification</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Facility Operational Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <span className="text-slate-400 text-xs font-mono uppercase block mb-1">Incoming Pallets</span>
          <h3 className="text-2xl font-bold text-white font-mono">{liveReturns.length + 12}</h3>
          <span className="text-[11px] text-slate-500">Reverse courier delivery queue</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <span className="text-slate-400 text-xs font-mono uppercase block mb-1">Gross Tare Weight</span>
          <h3 className="text-2xl font-bold text-cyan-400 font-mono">1,480 kg</h3>
          <span className="text-[11px] text-slate-500">Calibrated digital weighbridge</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <span className="text-slate-400 text-xs font-mono uppercase block mb-1">Kiln Chamber Temp</span>
          <h3 className="text-2xl font-bold text-rose-400 font-mono">1,215 °C</h3>
          <span className="text-[11px] text-emerald-400 font-semibold">● Bio-neutralizing active</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <span className="text-slate-400 text-xs font-mono uppercase block mb-1">Disposed Consignments</span>
          <h3 className="text-2xl font-bold text-purple-300 font-mono">890</h3>
          <span className="text-[11px] text-slate-500">Inbound Quarantine Complete</span>
        </div>
      </div>

      {/* Live Active Return Manifests in Reverse Chain */}
      {liveReturns.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Live Reverse Manifest Intake Queue
              </h3>
              <p className="text-xs text-slate-400">Consignments routed directly from pharmacy returns and wholesale depots</p>
            </div>
          </div>
          <div className="space-y-3">
            {liveReturns.map(ret => (
              <div
                key={ret.id}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-slate-700 transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-800/60 text-cyan-400">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-cyan-300">{ret.batch_id}</span>
                      <StatusBadge status={ret.status} size="sm" />
                    </div>
                    <span className="text-xs text-slate-300 font-mono block mt-0.5">Tracking: {ret.tracking_code}</span>
                    {ret.carrier_name && (
                      <span className="text-[11px] text-slate-400 font-mono block">Carrier: {ret.carrier_name} ({ret.driver_badge || 'No Badge'})</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase">Quantity</span>
                    <strong className="text-white">{ret.quantity.toLocaleString()} units</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase">Scale Tare</span>
                    <strong className="text-cyan-300">{ret.scale_weight_kg || '45.0'} kg</strong>
                  </div>
                  <button
                    onClick={() => {
                      setBatchNumber(ret.batch_id);
                      setQuantity(ret.quantity);
                      setShowDisposalModal(true);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-rose-600 border border-purple-500 text-white text-xs font-bold hover:brightness-110 transition-all shadow-md"
                  >
                    Complete Disposal (DISPOSED)
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Static Reverse Quarantine Intake Ledger */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Reverse Quarantine Intake Ledger
            </h3>
            <p className="text-xs text-slate-400">Pallets awaiting physical weighing, verification, and operational disposal</p>
          </div>
          <button
            onClick={() => {
              setBatchNumber('B1001');
              setQuantity(1000);
              setShowDisposalModal(true);
            }}
            className="text-xs font-semibold text-cyan-400 hover:underline flex items-center gap-1"
          >
            <span>Process Disposal B1001</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          {intakeItems.map(item => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-slate-700 transition-all"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/60 text-purple-400">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-cyan-300">{item.batch_number}</span>
                    <StatusBadge status={item.status} size="sm" />
                  </div>
                  <h4 className="text-xs font-semibold text-white mt-0.5">{item.medicine_name}</h4>
                  <span className="text-[11px] text-slate-400 font-mono">Manifest ID: {item.return_id}</span>
                </div>
              </div>

              <div className="flex items-center gap-6 text-xs font-mono">
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase">Count</span>
                  <strong className="text-white">{item.quantity.toLocaleString()} units</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase">Scale Weight</span>
                  <strong className="text-cyan-300">{item.weight_kg} kg</strong>
                </div>
                <button
                  onClick={() => {
                    setBatchNumber(item.batch_number);
                    setQuantity(item.quantity);
                    setShowDisposalModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-purple-900/60 border border-purple-700 text-purple-200 text-xs font-bold hover:bg-purple-800 transition-colors"
                >
                  Record Disposal
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Record Operational Disposal Modal */}
      <Modal
        isOpen={showDisposalModal}
        onClose={() => setShowDisposalModal(false)}
        title="Record Operational Pharmaceutical Disposal"
        subtitle="Executes operational disposal processing and transitions batch status to DISPOSED"
      >
        <form onSubmit={handleExecuteDisposal} className="space-y-4 text-xs">
          <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-800/50 text-blue-300 text-xs leading-relaxed flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong>Disposal Handling Protocol:</strong> Operational disposal logs physical intake and biohazard neutralization. Final destruction certification permanently inscribes the batch in the <strong>Dead Batch Registry</strong>.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Target Batch Identifier
              </label>
              <input
                type="text"
                value={batchNumber}
                onChange={e => setBatchNumber(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Quantity Disposed
              </label>
              <input
                type="number"
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Disposal Methodology
              </label>
              <select
                value={method}
                onChange={e => setMethod(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-medium"
              >
                <option value="HIGH_TEMP_INCINERATION_1200C">High-Temperature Incineration (1200°C Thermal Oxidation)</option>
                <option value="CHEMICAL_DENATURATION">Chemical Denaturation & Catalytic Neutralization</option>
                <option value="AUTOCLAVE_SHREDDING">High-Pressure Autoclave & Mechanical Shredding</option>
              </select>
            </div>
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Intake Scale Tare Weight (kg)
              </label>
              <input
                type="text"
                value={scaleWeightKg}
                onChange={e => setScaleWeightKg(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-cyan-300 font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
              Disposal Operation Notes
            </label>
            <textarea
              rows={2}
              value={operatorNotes}
              onChange={e => setOperatorNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowDisposalModal(false)}
              className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-rose-600 text-white font-bold hover:brightness-110 transition-all shadow-lg"
            >
              Confirm Facility Disposal (DISPOSED)
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DisposalManagementPage;
