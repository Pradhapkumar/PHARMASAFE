import React, { useState, useEffect } from 'react';
import { RotateCcw, PlusCircle, ArrowRight, Eye, ShieldCheck, Truck, FileText, CheckCircle2, AlertTriangle, Send } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import DataTable, { Column } from '../components/ui/DataTable';
import FilterBar from '../components/ui/FilterBar';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import returnService from '../services/returnService';
import batchService from '../services/batchService';
import { ReturnRequest, ReturnStatus, Batch } from '../types/api';
import { demoState } from '../mocks/mockData';

export const ReturnManagementPage: React.FC = () => {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [showRouteModal, setShowRouteModal] = useState<ReturnRequest | null>(null);

  // Form states for Create Return
  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);
  const [batchId, setBatchId] = useState('B1001');
  const [quantity, setQuantity] = useState(1000);
  const [reason, setReason] = useState('EXPIRED');
  const [notes, setNotes] = useState('Quarantined expired pharmacy stock per CDSCO mandate.');
  const [carrierName, setCarrierName] = useState('SecureMed Reverse Logistics');
  const [carrierTrackingRef, setCarrierTrackingRef] = useState('TRK-REV-8831');
  const [driverBadge, setDriverBadge] = useState('DRV-BDG-990');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Route to disposal state
  const [disposalFacilityId, setDisposalFacilityId] = useState('org_green_shield_disposal');

  const fetchReturns = async () => {
    const res = await returnService.getReturns();
    setReturns(res);
  };

  useEffect(() => {
    fetchReturns();
    batchService.getBatches().then(b => {
      if (Array.isArray(b) && b.length > 0) {
        setAvailableBatches(b);
        setBatchId(b[0].batch_number || b[0].id);
      }
    }).catch(err => console.warn('Could not fetch active batches:', err));
  }, [demoState.isB1001Returned]);

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      setCreateError(null);
      const res = await returnService.createReturn({
        batch_id: batchId,
        quantity: Number(quantity),
        reason: reason as any,
        destination_facility_id: 'org_green_shield_disposal',
        notes,
        carrier_name: carrierName,
        carrier_tracking_ref: carrierTrackingRef,
        driver_badge: driverBadge,
      });
      setReturns(prev => [res, ...prev]);
      setShowCreateModal(false);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create return manifest.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAdvanceStatus = async (item: ReturnRequest, nextStatus: ReturnStatus) => {
    try {
      const updated = await returnService.updateReturnStatus(
        item.id,
        nextStatus,
        `Status updated to ${nextStatus} via Reverse Logistics Portal`,
        nextStatus === 'RECEIVED_AT_DISPOSAL' || nextStatus === 'RECEIVED_AT_FACILITY' ? item.quantity : undefined,
        nextStatus === 'RECEIVED_AT_DISPOSAL' ? '45.5' : undefined
      );
      setReturns(prev => prev.map(r => r.id === item.id ? updated : r));
      if (selectedReturn && selectedReturn.id === item.id) {
        setSelectedReturn(updated);
      }
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleRouteToDisposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRouteModal) return;
    try {
      const updated = await returnService.routeReturnToDisposal(
        showRouteModal.id,
        disposalFacilityId,
        carrierName,
        carrierTrackingRef,
        driverBadge,
        'Routed from wholesale depot to bio-hazard incineration plant'
      );
      setReturns(prev => prev.map(r => r.id === showRouteModal.id ? updated : r));
      setShowRouteModal(null);
    } catch (err: any) {
      alert(`Routing failed: ${err.message}`);
    }
  };

  const filteredReturns = returns.filter(r =>
    r.tracking_code.toLowerCase().includes(search.toLowerCase()) ||
    r.batch_id.toLowerCase().includes(search.toLowerCase()) ||
    r.reason.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<ReturnRequest>[] = [
    {
      key: 'tracking_code',
      header: 'Tracking Manifest',
      sortable: true,
      render: item => (
        <div>
          <span className="font-mono font-bold text-cyan-400 block">{item.tracking_code}</span>
          {item.carrier_name && (
            <span className="text-[10px] text-slate-400 font-mono block">Carrier: {item.carrier_name}</span>
          )}
        </div>
      ),
    },
    {
      key: 'batch_id',
      header: 'Batch ID',
      sortable: true,
      render: item => <span className="font-mono font-bold text-white">{item.batch_id}</span>,
    },
    {
      key: 'quantity',
      header: 'Quantity',
      sortable: true,
      render: item => (
        <div>
          <span className="font-mono text-slate-200 block">{(item.quantity ?? 0).toLocaleString()} units</span>
          {item.received_quantity != null && (
            <span className="text-[10px] font-mono text-emerald-400 block">Rec: {Number(item.received_quantity).toLocaleString()}</span>
          )}
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Return Reason',
      sortable: true,
      render: item => (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-900 border border-slate-700 text-slate-300 font-mono">
          {item.reason}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Chain Status',
      sortable: true,
      render: item => <StatusBadge status={item.status} size="sm" />,
    },
    {
      key: 'actions',
      header: 'Reverse Actions',
      render: item => (
        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setSelectedReturn(item)}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 text-cyan-400 hover:text-white hover:bg-slate-800 text-xs font-semibold flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Manifest</span>
          </button>
          {item.status === 'INITIATED' && (
            <button
              onClick={() => handleAdvanceStatus(item, 'IN_TRANSIT')}
              className="px-2 py-1.5 rounded-lg bg-blue-900/60 border border-blue-700 text-blue-300 hover:bg-blue-800 text-[11px] font-bold flex items-center gap-1"
            >
              <Truck className="w-3 h-3" />
              <span>Handover Pickup</span>
            </button>
          )}
          {item.status === 'IN_TRANSIT' && (
            <button
              onClick={() => handleAdvanceStatus(item, 'RECEIVED_AT_DISPOSAL')}
              className="px-2 py-1.5 rounded-lg bg-purple-900/60 border border-purple-700 text-purple-300 hover:bg-purple-800 text-[11px] font-bold flex items-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Intake Plant</span>
            </button>
          )}
          {item.status === 'RECEIVED_AT_FACILITY' && (
            <button
              onClick={() => setShowRouteModal(item)}
              className="px-2 py-1.5 rounded-lg bg-amber-900/60 border border-amber-700 text-amber-300 hover:bg-amber-800 text-[11px] font-bold flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
              <span>Route Disposal</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reverse Logistics & Return Governance"
        description="Comprehensive reverse chain tracking for expired, recalled, or quarantined stock dispatched to authorized destruction facilities"
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-blue-950/60 border border-blue-500/40 text-blue-400">
            Closed-Loop Reverse Track
          </span>
        }
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 text-xs font-bold hover:brightness-110 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Return Manifest</span>
          </button>
        }
      />

      {/* Filter Bar */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by Tracking Code, Batch ID, or Return Reason..."
      />

      {/* Returns Data Table */}
      <DataTable
        columns={columns}
        data={filteredReturns}
        keyField="id"
        onRowClick={item => setSelectedReturn(item)}
      />

      {/* Create Return Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setCreateError(null);
        }}
        title="Initiate Reverse Logistics Return"
        subtitle="Create chain-of-custody return manifest for unauthorized or expired stock"
      >
        <form onSubmit={handleCreateReturn} className="space-y-4 text-xs">
          {createError && (
            <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{createError}</span>
            </div>
          )}

          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
              Batch Identification
            </label>
            <select
              value={batchId}
              onChange={e => setBatchId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
            >
              {availableBatches.length > 0 ? (
                availableBatches.map(b => (
                  <option key={b.id} value={b.batch_number || b.id}>
                    {b.batch_number} {b.medicine ? `(${b.medicine.brand_name})` : ''} — Qty: {b.current_quantity ?? b.initial_quantity}
                  </option>
                ))
              ) : (
                <>
                  <option value="B1001">B1001 (Paracetamol 500mg IP)</option>
                  <option value="B1003">B1003 (Azithral 250 - Expired)</option>
                  <option value="B1004">B1004 (Remdec 100mg - Recalled Lot)</option>
                  <option value="B1005">B1005 (Dolo-650 - Quantity Discrepancy)</option>
                </>
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Quantity Units to Return
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Return Reason
              </label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-medium"
              >
                <option value="EXPIRED">EXPIRED</option>
                <option value="RECALLED">RECALLED LOT</option>
                <option value="SUSPECT_COUNTERFEIT">SUSPECT COUNTERFEIT</option>
                <option value="DAMAGED_IN_TRANSIT">DAMAGED IN TRANSIT</option>
                <option value="STORAGE_BREACH">STORAGE TEMP BREACH</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Reverse Carrier Name
              </label>
              <input
                type="text"
                value={carrierName}
                onChange={e => setCarrierName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Carrier Waybill Ref
              </label>
              <input
                type="text"
                value={carrierTrackingRef}
                onChange={e => setCarrierTrackingRef(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Driver Badge ID
              </label>
              <input
                type="text"
                value={driverBadge}
                onChange={e => setDriverBadge(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
              Destination Disposal Facility
            </label>
            <input
              type="text"
              readOnly
              value="GreenShield Bio-Hazard Incineration Facility (Hyderabad Zone 4)"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 font-medium"
            />
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
              Manifest Justification & Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-sans"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                setCreateError(null);
              }}
              className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-5 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition-colors shadow-lg disabled:opacity-50 flex items-center gap-1.5"
            >
              {isCreating && <RotateCcw className="w-3.5 h-3.5 animate-spin" />}
              <span>{isCreating ? 'Signing...' : 'Sign & Dispatch Manifest'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Route to Disposal Modal */}
      {showRouteModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowRouteModal(null)}
          title={`Route Return Consignment: ${showRouteModal.tracking_code}`}
          subtitle={`Route return batch ${showRouteModal.batch_id} from wholesale depot to disposal facility`}
        >
          <form onSubmit={handleRouteToDisposal} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Target Bio-Hazard Disposal Facility
              </label>
              <select
                value={disposalFacilityId}
                onChange={e => setDisposalFacilityId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-medium"
              >
                <option value="org_green_shield_disposal">GreenShield Bio-Hazard Incineration (Hyderabad)</option>
                <option value="org_eco_destroy_mumbai">EcoDestroy Thermal Denaturation Plant (Mumbai)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Transporter Carrier
                </label>
                <input
                  type="text"
                  value={carrierName}
                  onChange={e => setCarrierName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Driver Badge ID
                </label>
                <input
                  type="text"
                  value={driverBadge}
                  onChange={e => setDriverBadge(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRouteModal(null)}
                className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400"
              >
                Dispatch to Disposal Plant
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Evidence / Manifest Detail Modal */}
      {selectedReturn && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedReturn(null)}
          title={`Return Manifest: ${selectedReturn.tracking_code}`}
          subtitle={`Chain of custody return record for batch ${selectedReturn.batch_id}`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500 uppercase font-mono text-[10px] block">Batch ID</span>
                <strong className="text-white font-mono text-sm block">{selectedReturn.batch_id}</strong>
              </div>
              <div>
                <span className="text-slate-500 uppercase font-mono text-[10px] block">Returned Units</span>
                <strong className="text-white font-mono text-sm block">{(selectedReturn.quantity ?? 0).toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-slate-500 uppercase font-mono text-[10px] block">Return Reason</span>
                <strong className="text-amber-400 block">{selectedReturn.reason}</strong>
              </div>
              <div>
                <span className="text-slate-500 uppercase font-mono text-[10px] block">Current Status</span>
                <StatusBadge status={selectedReturn.status} size="sm" />
              </div>
            </div>

            {selectedReturn.carrier_name && (
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500 uppercase font-mono text-[10px] block">Carrier Transporter</span>
                  <span className="text-slate-200 font-semibold">{selectedReturn.carrier_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase font-mono text-[10px] block">Waybill Reference</span>
                  <span className="text-cyan-400 font-mono font-semibold">{selectedReturn.carrier_tracking_ref || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase font-mono text-[10px] block">Driver Badge</span>
                  <span className="text-slate-300 font-mono font-semibold">{selectedReturn.driver_badge || 'N/A'}</span>
                </div>
              </div>
            )}

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1 font-mono">
              <span className="text-slate-500 uppercase text-[10px] block">Digital Manifest SHA-256 Hash</span>
              <span className="text-cyan-400 font-semibold text-[11px] block break-all">
                {selectedReturn.manifest_hash || 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069'}
              </span>
            </div>

            {selectedReturn.notes && (
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-slate-500 uppercase font-mono text-[10px] block mb-1">Chain Notes</span>
                <p className="text-slate-300 leading-relaxed font-sans">{selectedReturn.notes}</p>
              </div>
            )}

            <div className="pt-2 flex justify-between items-center">
              <div className="flex gap-2">
                {selectedReturn.status === 'INITIATED' && (
                  <button
                    onClick={() => handleAdvanceStatus(selectedReturn, 'IN_TRANSIT')}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 flex items-center gap-1"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Confirm Pickup</span>
                  </button>
                )}
                {selectedReturn.status === 'IN_TRANSIT' && (
                  <button
                    onClick={() => handleAdvanceStatus(selectedReturn, 'RECEIVED_AT_DISPOSAL')}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-500 flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Intake & Weighed</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedReturn(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 font-semibold"
              >
                Close Manifest
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ReturnManagementPage;
