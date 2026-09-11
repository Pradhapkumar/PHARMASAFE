import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Boxes, Search, Filter, Send, ExternalLink, QrCode, 
  CheckCircle2, AlertTriangle, ArrowRight, Building2, Truck
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import LoadingState from '../components/ui/LoadingState';
import batchService, { Batch } from '../services/batchService';

export const ManufacturerInventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Distribution Modal State
  const [selectedBatchForTransfer, setSelectedBatchForTransfer] = useState<Batch | null>(null);
  const [transferQty, setTransferQty] = useState<number>(1000);
  const [targetOrg, setTargetOrg] = useState('org_apollo_dist');
  const [carrierNotes, setCarrierNotes] = useState('Cold-chain secure transport. Manifest #TRK-LOG-2024.');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<any | null>(null);

  const loadBatches = async () => {
    try {
      setLoading(true);
      const data = await batchService.getBatches(
        statusFilter === 'ALL' ? undefined : statusFilter,
        searchTerm || undefined
      );
      setBatches(data);
    } catch (err) {
      console.error('Error fetching manufacturer batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, [statusFilter, searchTerm]);

  const handleOpenTransfer = (batch: Batch) => {
    setSelectedBatchForTransfer(batch);
    setTransferQty(Math.min(batch.current_quantity, 5000));
    setTransferError(null);
    setTransferSuccess(null);
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchForTransfer) return;

    if (transferQty <= 0) {
      setTransferError('Transfer quantity must be greater than 0.');
      return;
    }

    if (transferQty > selectedBatchForTransfer.current_quantity) {
      setTransferError(`Cannot transfer more than available stock (${selectedBatchForTransfer.current_quantity} ${selectedBatchForTransfer.unit}).`);
      return;
    }

    try {
      setIsTransferring(true);
      setTransferError(null);

      const result = await batchService.prepareDistribution({
        batch_id: selectedBatchForTransfer.id,
        to_org_id: targetOrg,
        quantity: transferQty,
        notes: carrierNotes,
      });

      setTransferSuccess(result);
      await loadBatches();
    } catch (err: any) {
      setTransferError(err.message || 'Custody transfer failed.');
    } finally {
      setIsTransferring(false);
    }
  };

  // KPIs
  const totalOnHand = batches.reduce((sum, b) => sum + (b.current_quantity || 0), 0);
  const totalManufactured = batches.reduce((sum, b) => sum + (b.initial_quantity || 0), 0);
  const activeBatchesCount = batches.filter((b) => b.status === 'MANUFACTURED' || b.status === 'IN_DISTRIBUTION' || b.status === 'AT_PHARMACY').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manufacturer Inventory & Depot Management"
        description="Monitor physical stock levels, prepare wholesale distribution manifests, and cryptographically transfer custody"
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
            Plant Depot Floor
          </span>
        }
        actions={
          <button
            onClick={() => navigate('/register')}
            className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:brightness-110 transition-all cursor-pointer"
          >
            <span>+ Inscribe New Batch</span>
          </button>
        }
      />

      {/* Top Stat Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <span className="text-slate-400 text-xs uppercase font-mono block">Available Depot Units</span>
          <span className="text-2xl font-bold font-mono text-cyan-400 mt-1 block">
            {totalOnHand.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Ready for wholesale dispatch</span>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <span className="text-slate-400 text-xs uppercase font-mono block">Total Lifetime Output</span>
          <span className="text-2xl font-bold font-mono text-white mt-1 block">
            {totalManufactured.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Across all registered lots</span>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <span className="text-slate-400 text-xs uppercase font-mono block">Active Lots On Floor</span>
          <span className="text-2xl font-bold font-mono text-purple-400 mt-1 block">
            {activeBatchesCount}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">In manufacturing / custody</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search batch number, GTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-400 font-mono shrink-0">Status:</span>
          {['ALL', 'MANUFACTURED', 'DISTRIBUTED', 'ACTIVE', 'EXPIRED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                statusFilter === s
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      {loading ? (
        <LoadingState message="Loading Manufacturer Inventory..." />
      ) : batches.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center text-slate-500">
          <Boxes className="w-10 h-10 mx-auto mb-2 text-slate-600" />
          <p className="text-sm font-medium">No batch inventory found matching filter.</p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">Batch / GTIN</th>
                  <th className="p-3.5">Medicine Product</th>
                  <th className="p-3.5">Dates (Mfg / Exp)</th>
                  <th className="p-3.5 text-right">Available Stock</th>
                  <th className="p-3.5 text-right">Initial Size</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {batches.map((batch) => {
                  const isAvailableForTransfer = batch.current_quantity > 0 && batch.status !== 'DEAD_BATCH' && batch.status !== 'DESTROYED';
                  return (
                    <tr key={batch.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-white text-sm">{batch.batch_number}</div>
                        <div className="text-[10px] font-mono text-slate-400">{batch.gtin_barcode}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-200">{batch.medicine?.brand_name || 'Pharmaceutical Item'}</div>
                        <div className="text-[11px] text-slate-400">{batch.medicine?.generic_name || 'API Molecule'}</div>
                      </td>
                      <td className="p-3.5 font-mono text-[11px]">
                        <div className="text-slate-300">Mfg: {batch.mfg_date}</div>
                        <div className={batch.status === 'EXPIRED' ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                          Exp: {batch.expiry_date}
                        </div>
                      </td>
                      <td className="p-3.5 text-right font-mono">
                        <span className="text-cyan-300 font-bold text-sm">
                          {batch.current_quantity.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">{batch.unit}</span>
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-400">
                        {batch.initial_quantity.toLocaleString()} {batch.unit}
                      </td>
                      <td className="p-3.5 text-center">
                        <StatusBadge status={batch.status} size="sm" />
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isAvailableForTransfer && (
                            <button
                              onClick={() => handleOpenTransfer(batch)}
                              className="px-2.5 py-1 rounded bg-cyan-950 border border-cyan-700/70 text-cyan-300 hover:bg-cyan-900 font-semibold text-[11px] flex items-center gap-1 transition-all"
                              title="Prepare Custody Transfer to Wholesale Distributor"
                            >
                              <Send className="w-3 h-3" />
                              <span>Dispatch</span>
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/batches/${batch.batch_number}`)}
                            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white font-semibold text-[11px] flex items-center gap-1 transition-all"
                            title="Inspect Digital Batch Passport"
                          >
                            <ExternalLink className="w-3 h-3 text-cyan-400" />
                            <span>Passport</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Prepare for Distribution Modal */}
      {selectedBatchForTransfer && (
        <Modal
          isOpen={Boolean(selectedBatchForTransfer)}
          onClose={() => setSelectedBatchForTransfer(null)}
          title={`Prepare Batch Distribution: ${selectedBatchForTransfer.batch_number}`}
          subtitle="Cryptographic Custody Handover to Licensed Distributor"
        >
          {transferSuccess ? (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Custody Transfer Recorded</h4>
              <p className="text-xs text-slate-400">
                Successfully dispatched {transferQty.toLocaleString()} {selectedBatchForTransfer.unit} to wholesale logistics.
              </p>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 font-mono text-[11px] text-left text-cyan-300 space-y-1">
                <div><strong>Event ID:</strong> {transferSuccess.id || 'EVT-TX-RECORDED'}</div>
                <div><strong>From:</strong> Manufacturer Plant Depot</div>
                <div><strong>To Org:</strong> {targetOrg}</div>
                <div><strong>Timestamp:</strong> {new Date().toISOString()}</div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setSelectedBatchForTransfer(null)}
                  className="flex-1 py-2 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Done
                </button>
                <button
                  onClick={() => {
                    const bNum = selectedBatchForTransfer.batch_number;
                    setSelectedBatchForTransfer(null);
                    navigate(`/batches/${bNum}`);
                  }}
                  className="flex-1 py-2 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 flex items-center justify-center gap-1"
                >
                  <span>View Updated Passport</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleExecuteTransfer} className="space-y-4">
              {transferError && (
                <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{transferError}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Batch Number:</span>
                  <span className="text-white font-mono font-bold">{selectedBatchForTransfer.batch_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Medicine:</span>
                  <span className="text-cyan-300 font-semibold">{selectedBatchForTransfer.medicine?.brand_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Depot Stock:</span>
                  <span className="text-slate-200 font-mono font-bold">
                    {selectedBatchForTransfer.current_quantity.toLocaleString()} {selectedBatchForTransfer.unit}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Target Recipient Distributor
                </label>
                <select
                  value={targetOrg}
                  onChange={(e) => setTargetOrg(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="org_apollo_dist">Apollo National Distribution Hub (Delhi Logistics Hub)</option>
                  <option value="org_medplus_pharm">MedPlus Central Logistics Hub (Bengaluru)</option>
                  <option value="org_state_wholesaler">State Healthcare Logistics Depot #4</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Dispatch Quantity ({selectedBatchForTransfer.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedBatchForTransfer.current_quantity}
                  value={transferQty}
                  onChange={(e) => setTransferQty(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Transport Manifest / Carrier Security Notes
                </label>
                <textarea
                  rows={2}
                  value={carrierNotes}
                  onChange={(e) => setCarrierNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedBatchForTransfer(null)}
                  className="flex-1 py-2 px-3 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTransferring}
                  className="flex-1 py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>{isTransferring ? 'Inscribing Transfer...' : 'Confirm Dispatch'}</span>
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
};

export default ManufacturerInventoryPage;
