import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Truck, AlertTriangle, CheckCircle2, Boxes, ArrowRight, ShieldAlert,
  Search, Filter, ExternalLink, Send, QrCode, RefreshCw, Layers, ShieldCheck
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import LoadingState from '../components/ui/LoadingState';
import inventoryService, { InboundShipmentItem } from '../services/inventoryService';
import dashboardService from '../services/dashboardService';
import batchService from '../services/batchService';
import { InventoryRecord } from '../types/api';

export const DistributorPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'incoming' | 'inventory' | 'transfers' | 'driver_navigation' | 'verify_pharmacy') || 'incoming';
  const [activeTab, setActiveTab] = useState<'incoming' | 'inventory' | 'transfers' | 'driver_navigation' | 'verify_pharmacy'>(initialTab);

  // Data States
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [inboundItems, setInboundItems] = useState<InboundShipmentItem[]>([]);
  const [inventoryRecords, setInventoryRecords] = useState<InventoryRecord[]>([]);
  const [outgoingTransfers, setOutgoingTransfers] = useState<any[]>([]);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Receiving Modal State
  const [selectedShipment, setSelectedShipment] = useState<InboundShipmentItem | null>(null);
  const [receivedQtyInput, setReceivedQtyInput] = useState<number>(0);
  const [receivingNotes, setReceivingNotes] = useState('');
  const [isReceiving, setIsReceiving] = useState(false);
  const [receiveSuccess, setReceiveSuccess] = useState<any | null>(null);
  const [receiveError, setReceiveError] = useState<string | null>(null);

  // Dispatch Modal State
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchBatchId, setDispatchBatchId] = useState('');
  const [dispatchTargetOrg, setDispatchTargetOrg] = useState('org_medplus_retail');
  const [dispatchQty, setDispatchQty] = useState<number>(500);
  const [dispatchNotes, setDispatchNotes] = useState('Wholesale supply route #TRK-DELHI-BLR');
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [dispatchSuccess, setDispatchSuccess] = useState<any | null>(null);

  // Pharmacy license verification
  const [pharmacyVerifications, setPharmacyVerifications] = useState([
    { id: 'PHARM-001', name: 'MedPlus Pharmacy #BLR-882', license: 'PHM-MH-2022-8812', gov_id: 'GSTIN-29ABCDE1234F1Z5', state: 'Karnataka', status: 'VERIFIED', verified_on: '2026-01-15' },
    { id: 'PHARM-002', name: 'Apollo Pharmacy #CHN-241', license: 'PHM-TN-2023-5521', gov_id: 'GSTIN-33FGHIJ5678K2A6', state: 'Tamil Nadu', status: 'VERIFIED', verified_on: '2026-03-02' },
    { id: 'PHARM-003', name: 'NetMeds Pharmacy #MUM-119', license: 'PHM-MH-2024-3310', gov_id: 'GSTIN-27KLMNO9012L3B7', state: 'Maharashtra', status: 'PENDING', verified_on: '' },
    { id: 'PHARM-004', name: 'Wellness Pharmacy #DEL-077', license: 'PHM-DL-2021-7734', gov_id: 'GSTIN-07PQRST3456M4C8', state: 'Delhi', status: 'REVOKED', verified_on: '2025-11-08' },
  ]);
  const [verifyingPharmacy, setVerifyingPharmacy] = useState<string | null>(null);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [dash, inbound, inv, out] = await Promise.all([
        dashboardService.getDistributorDashboard(),
        inventoryService.getInboundShipments(),
        inventoryService.getInventory(statusFilter === 'ALL' ? undefined : statusFilter, search || undefined),
        inventoryService.getOutgoingShipments(),
      ]);
      setDashboardData(dash);
      setInboundItems(inbound);
      setInventoryRecords(inv);
      setOutgoingTransfers(out);
    } catch (err) {
      console.error('Error loading distributor data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [statusFilter, search]);

  const handleTabChange = (tab: 'incoming' | 'inventory' | 'transfers' | 'driver_navigation' | 'verify_pharmacy') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Open Receive Modal
  const handleOpenReceive = (item: InboundShipmentItem) => {
    setSelectedShipment(item);
    setReceivedQtyInput(item.expected_quantity);
    setReceivingNotes('');
    setReceiveError(null);
    setReceiveSuccess(null);
  };

  // Submit Receiving / Quantity Reconciliation
  const handleConfirmReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment) return;

    if (receivedQtyInput < 0) {
      setReceiveError('Physical received quantity cannot be negative.');
      return;
    }

    try {
      setIsReceiving(true);
      setReceiveError(null);
      const res = await inventoryService.receiveShipment(
        selectedShipment.id,
        receivedQtyInput,
        receivingNotes
      );
      setReceiveSuccess(res);
      await loadAllData();
    } catch (err: any) {
      setReceiveError(err.message || 'Receiving reconciliation failed.');
    } finally {
      setIsReceiving(false);
    }
  };

  // Open Dispatch Modal
  const handleOpenDispatch = (batchId?: string, currentStock?: number) => {
    setDispatchBatchId(batchId || (inventoryRecords[0]?.batch_id || ''));
    setDispatchQty(currentStock ? Math.min(currentStock, 500) : 500);
    setDispatchError(null);
    setDispatchSuccess(null);
    setShowDispatchModal(true);
  };

  // Submit Dispatch to Pharmacy
  const handleConfirmDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchBatchId) {
      setDispatchError('Please select an active batch.');
      return;
    }
    if (dispatchQty <= 0) {
      setDispatchError('Dispatch quantity must be greater than 0.');
      return;
    }

    try {
      setIsDispatching(true);
      setDispatchError(null);
      const res = await inventoryService.dispatchShipment({
        batch_id: dispatchBatchId,
        to_organization_id: dispatchTargetOrg,
        quantity: Number(dispatchQty),
        notes: dispatchNotes,
      });
      setDispatchSuccess(res);
      await loadAllData();
    } catch (err: any) {
      setDispatchError(err.message || 'Dispatch transfer failed.');
    } finally {
      setIsDispatching(false);
    }
  };

  // Filtered inbounds
  const filteredInbounds = inboundItems.filter(
    item =>
      item.batch_number.toLowerCase().includes(search.toLowerCase()) ||
      item.medicine_name.toLowerCase().includes(search.toLowerCase()) ||
      item.sender_org.toLowerCase().includes(search.toLowerCase())
  );

  const activeDiscrepancyItem = inboundItems.find(i => i.has_discrepancy || i.discrepancy !== 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Distributor Logistics Hub"
        description="Wholesale inventory intake, manifest cross-referencing, quantity reconciliation, and retail dispatch"
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-blue-950/60 border border-blue-500/40 text-blue-400">
            Apollo National Distribution Depot
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenDispatch()}
              className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:brightness-110 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch to Pharmacy</span>
            </button>
          </div>
        }
      />

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <span className="text-slate-400 text-xs uppercase font-mono block">Depot On-Hand Units</span>
          <span className="text-2xl font-bold font-mono text-cyan-400 mt-1 block">
            {(dashboardData?.total_inventory || 0).toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Dispense-ready warehouse stock</span>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <span className="text-slate-400 text-xs uppercase font-mono block">Lifetime Received Units</span>
          <span className="text-2xl font-bold font-mono text-white mt-1 block">
            {(dashboardData?.total_received || 0).toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Across all wholesale intakes</span>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <span className="text-slate-400 text-xs uppercase font-mono block">Pending Inbound Shipments</span>
          <span className="text-2xl font-bold font-mono text-purple-400 mt-1 block">
            {dashboardData?.pending_receiving || inboundItems.filter(i => !i.is_confirmed).length}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Awaiting physical intake check</span>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <span className="text-slate-400 text-xs uppercase font-mono block">Quantity Discrepancies</span>
          <span className={`text-2xl font-bold font-mono mt-1 block ${
            (dashboardData?.discrepancies_count || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
          }`}>
            {dashboardData?.discrepancies_count || (activeDiscrepancyItem ? 1 : 0)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Reconciliation variances flagged</span>
        </div>
      </div>

      {/* Prominent Discrepancy Alert Banner */}
      {activeDiscrepancyItem && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-amber-200">
                Shipment Discrepancy Flagged: Batch {activeDiscrepancyItem.batch_number} ({activeDiscrepancyItem.medicine_name})
              </h4>
              <p className="text-xs text-amber-300/80 mt-0.5 font-mono">
                EXPECTED: {activeDiscrepancyItem.expected_quantity} • RECEIVED: {activeDiscrepancyItem.received_quantity} • DISCREPANCY: {activeDiscrepancyItem.discrepancy} UNITS
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded bg-amber-900/60 border border-amber-600/60 text-xs font-mono font-bold text-amber-200 shrink-0">
            INVESTIGATION INITIATED
          </span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => handleTabChange('incoming')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'incoming'
              ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
              : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Incoming Shipments & Scans ({inboundItems.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('inventory')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'inventory'
              ? 'bg-cyan-500 text-slate-950'
              : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>Active Warehouse Stock ({inventoryRecords.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('transfers')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'transfers'
              ? 'bg-cyan-500 text-slate-950'
              : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Outbound Pharmacy Transfers ({outgoingTransfers.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('driver_navigation')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'driver_navigation'
              ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Truck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Driver GPS Live Route Navigation</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-950 text-emerald-300 font-mono font-bold animate-pulse">
            LIVE
          </span>
        </button>

        <button
          onClick={() => handleTabChange('verify_pharmacy')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'verify_pharmacy'
              ? 'bg-purple-500 text-slate-950 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Pharmacy License Verification</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-purple-950 text-purple-300 font-mono font-bold">
            {pharmacyVerifications.filter(p => p.status === 'PENDING').length} Pending
          </span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-3.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search batch, GTIN, product, sender..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-medium"
          />
        </div>

        {activeTab === 'inventory' && (
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {['ALL', 'IN_DISTRIBUTION', 'EXPIRED', 'RECALLED'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded text-xs font-semibold ${
                  statusFilter === s
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TAB 1: Incoming Shipments */}
      {activeTab === 'incoming' && (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">Batch / GTIN</th>
                  <th className="p-3.5">Pharmaceutical Item</th>
                  <th className="p-3.5">Sender Facility</th>
                  <th className="p-3.5 text-right">Expected</th>
                  <th className="p-3.5 text-right">Received</th>
                  <th className="p-3.5 text-center">Variance Check</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredInbounds.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      No incoming shipments found.
                    </td>
                  </tr>
                ) : (
                  filteredInbounds.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-white text-sm">{item.batch_number}</div>
                        <div className="text-[10px] font-mono text-slate-400">{item.gtin_barcode || 'GS1-Compliant'}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-200">{item.medicine_name}</div>
                        <div className="text-[10px] font-mono text-slate-400">Exp: {item.expiry_date}</div>
                      </td>
                      <td className="p-3.5 text-slate-300">{item.sender_org}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-300">
                        {(item.expected_quantity ?? 0).toLocaleString()}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-white">
                        {item.is_confirmed ? (item.received_quantity ?? 0).toLocaleString() : 'Pending Intake'}
                      </td>
                      <td className="p-3.5 text-center">
                        {item.discrepancy !== 0 ? (
                          <span className="px-2 py-0.5 rounded bg-rose-950/70 border border-rose-600/60 text-rose-300 font-mono text-[11px] font-bold">
                            ⚠️ {item.discrepancy > 0 ? `+${item.discrepancy}` : item.discrepancy} units
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-mono text-xs font-semibold flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>0 Variance</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <StatusBadge 
                          status={item.status === 'DISCREPANCY_FLAGGED' ? 'DISCREPANCY_FLAGGED' : (item.is_confirmed ? 'VERIFIED' : 'PENDING')} 
                          size="sm" 
                        />
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!item.is_confirmed ? (
                            <button
                              onClick={() => handleOpenReceive(item)}
                              className="px-2.5 py-1 rounded bg-cyan-950 border border-cyan-700/70 text-cyan-300 hover:bg-cyan-900 font-semibold text-[11px] flex items-center gap-1 transition-all"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Verify & Receive</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => navigate(`/batches/${item.batch_number}`)}
                              className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white font-semibold text-[11px] flex items-center gap-1 transition-all"
                            >
                              <ExternalLink className="w-3 h-3 text-cyan-400" />
                              <span>Passport</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Warehouse Inventory */}
      {activeTab === 'inventory' && (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">Batch Identifier</th>
                  <th className="p-3.5">Pharmaceutical Item</th>
                  <th className="p-3.5">Expiry Date</th>
                  <th className="p-3.5 text-right">Available Stock</th>
                  <th className="p-3.5 text-right">Total Received</th>
                  <th className="p-3.5 text-center">Batch Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {inventoryRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No inventory records found.
                    </td>
                  </tr>
                ) : (
                  inventoryRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-white text-sm">{rec.batch_number || rec.batch_id}</div>
                        <div className="text-[10px] font-mono text-slate-500">Lot Inscribed</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-200">{rec.medicine_brand_name || 'Pharmaceutical Item'}</div>
                        <div className="text-[10px] text-slate-400">{rec.medicine_generic_name} • {rec.dosage_form}</div>
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-300">
                        {rec.expiry_date || 'N/A'}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-cyan-300 text-sm">
                        {(rec.quantity_available ?? 0).toLocaleString()}
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-400">
                        {(rec.quantity_received ?? 0).toLocaleString()}
                      </td>
                      <td className="p-3.5 text-center">
                        <StatusBadge status={(rec.batch_status as any) || 'IN_DISTRIBUTION'} size="sm" />
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {rec.quantity_available > 0 && (
                            <button
                              onClick={() => handleOpenDispatch(rec.batch_id, rec.quantity_available)}
                              className="px-2.5 py-1 rounded bg-cyan-950 border border-cyan-700/70 text-cyan-300 hover:bg-cyan-900 font-semibold text-[11px] flex items-center gap-1 transition-all"
                            >
                              <Send className="w-3 h-3" />
                              <span>Dispatch</span>
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/batches/${rec.batch_number || rec.batch_id}`)}
                            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white font-semibold text-[11px] flex items-center gap-1 transition-all"
                          >
                            <ExternalLink className="w-3 h-3 text-cyan-400" />
                            <span>Passport</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Outbound Transfers */}
      {activeTab === 'transfers' && (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">Transfer Ref</th>
                  <th className="p-3.5">Batch ID</th>
                  <th className="p-3.5">Destination Partner</th>
                  <th className="p-3.5 text-right">Dispatched Qty</th>
                  <th className="p-3.5 text-right">Partner Verified</th>
                  <th className="p-3.5 text-center">Handshake Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {outgoingTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No outbound transfers recorded yet.
                    </td>
                  </tr>
                ) : (
                  outgoingTransfers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3.5 font-mono text-cyan-300 font-bold">{t.id}</td>
                      <td className="p-3.5 font-mono text-white">{t.batch_number}</td>
                      <td className="p-3.5 text-slate-300">{t.to_organization_name || t.to_org}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-purple-300">{t.transferred_quantity || t.quantity}</td>
                      <td className="p-3.5 text-right font-mono text-slate-300">{t.verified_quantity != null ? t.verified_quantity : 'Pending'}</td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                          t.is_confirmed ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {t.is_confirmed ? 'CONFIRMED RECEIPT' : 'IN-TRANSIT'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => navigate(`/batches/${t.batch_number}`)}
                          className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-cyan-300 text-xs font-semibold"
                        >
                          Passport
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Driver GPS Live Route Navigation */}
      {activeTab === 'driver_navigation' && (
        <div className="space-y-6">
          {/* Driver Telemetry & Delivery Progress Bar */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">Active Driver GPS Route Navigation</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40 animate-pulse">
                      ● IN-TRANSIT DELIVERY
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Real-time driver location, cold-chain sensor telemetry, and ETA countdown</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] uppercase font-mono block">Estimated Arrival</span>
                  <span className="text-xl font-black text-emerald-400 font-mono">14 Mins</span>
                </div>
                <div className="h-8 w-px bg-slate-800" />
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] uppercase font-mono block">Cold-Chain Temp</span>
                  <span className="text-xl font-black text-cyan-400 font-mono">+4.2 °C</span>
                </div>
              </div>
            </div>

            {/* Driver Profile Card & Vehicle Info */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Assigned Driver</span>
                <strong className="text-white text-sm block">Ramesh Singh</strong>
                <span className="text-xs text-emerald-400 font-mono">ID: DRV-MH-8842 • Verified</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Government License Proof</span>
                <strong className="text-white text-sm block">DL-04202100891</strong>
                <span className="text-xs text-slate-400 font-mono">Commercial Transport Badge</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Refrigerated Vehicle</span>
                <strong className="text-white text-sm block">MH-02-EQ-8812</strong>
                <span className="text-xs text-cyan-400 font-mono">Cold-Chain Speed: 44 km/h</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Current GPS Coordinates</span>
                <strong className="text-white text-sm font-mono block">19.0760° N, 72.8777° E</strong>
                <span className="text-xs text-amber-400 font-mono">Bandra-Kurla Expressway</span>
              </div>
            </div>

            {/* Simulated Live GPS Route Visualizer */}
            <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  Depot A (Apollo Warehouse, Bhiwandi)
                </span>
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-emerald-400 animate-bounce" />
                  Live GPS Route: 68% Completed
                </span>
                <span className="text-slate-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Destination: MedPlus Pharmacy (Bandra West)
                </span>
              </div>

              {/* Animated Progress Bar */}
              <div className="relative w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-500 rounded-full w-[68%] transition-all duration-1000" />
              </div>

              {/* Waypoint History Log */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs font-mono">
                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-emerald-400 font-bold block">✓ 09:15 AM — Dispatched</span>
                  <span className="text-slate-400 text-[11px]">Departure from Apollo Depot A. Seal #SL-8812 verified.</span>
                </div>
                <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/40">
                  <span className="text-cyan-300 font-bold block">⚡ 10:20 AM — Transit Checkpoint</span>
                  <span className="text-slate-300 text-[11px]">Cold-chain telemetry nominal: +4.2°C. Speed 44 km/h.</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-amber-400 font-bold block">⏳ 10:45 AM (ETA) — Arrival</span>
                  <span className="text-slate-400 text-[11px]">Approaching MedPlus Pharmacy intake bay for QR scan.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PHARMACY LICENSE VERIFICATION */}
      {activeTab === 'verify_pharmacy' && (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Pharmacy Identity & License Verification</h3>
              <p className="text-xs text-slate-400 mt-0.5">Verify government-issued pharmacy license, GSTIN, and Drug License before authorizing supply dispatch. Unverified or revoked pharmacies are blocked from receiving stock.</p>
            </div>
            <span className="px-3 py-1 rounded-lg bg-purple-950/60 border border-purple-500/40 text-purple-300 text-xs font-mono font-bold self-start shrink-0">
              CDSCO Regulatory Gate
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">Pharmacy Name</th>
                  <th className="p-3.5">Drug License No.</th>
                  <th className="p-3.5">GSTIN / Gov ID</th>
                  <th className="p-3.5">State</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center">Verified On</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pharmacyVerifications.map(pharmacy => (
                  <tr key={pharmacy.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3.5">
                      <div className="font-semibold text-white">{pharmacy.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{pharmacy.id}</div>
                    </td>
                    <td className="p-3.5 font-mono text-cyan-400">{pharmacy.license}</td>
                    <td className="p-3.5 font-mono text-slate-300 text-[11px]">{pharmacy.gov_id}</td>
                    <td className="p-3.5 text-slate-300">{pharmacy.state}</td>
                    <td className="p-3.5 text-center">
                      {pharmacy.status === 'VERIFIED' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 border border-emerald-500/40 text-emerald-300 flex items-center gap-1 w-fit mx-auto">
                          <CheckCircle2 className="w-2.5 h-2.5" /> VERIFIED
                        </span>
                      )}
                      {pharmacy.status === 'PENDING' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950 border border-amber-500/40 text-amber-300 flex items-center gap-1 w-fit mx-auto">
                          <AlertTriangle className="w-2.5 h-2.5" /> PENDING
                        </span>
                      )}
                      {pharmacy.status === 'REVOKED' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-950 border border-rose-500/40 text-rose-300 flex items-center gap-1 w-fit mx-auto">
                          <ShieldAlert className="w-2.5 h-2.5" /> REVOKED
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-center font-mono text-slate-400">
                      {pharmacy.verified_on || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        {pharmacy.status === 'PENDING' && (
                          <button
                            onClick={() => setPharmacyVerifications(prev => prev.map(p =>
                              p.id === pharmacy.id ? { ...p, status: 'VERIFIED', verified_on: new Date().toISOString().slice(0, 10) } : p
                            ))}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-900/80 border border-emerald-600 text-emerald-200 text-[11px] font-bold hover:bg-emerald-800 transition-colors flex items-center gap-1"
                          >
                            <ShieldCheck className="w-3 h-3" /> Approve
                          </button>
                        )}
                        {pharmacy.status === 'VERIFIED' && (
                          <button
                            onClick={() => setPharmacyVerifications(prev => prev.map(p =>
                              p.id === pharmacy.id ? { ...p, status: 'REVOKED' } : p
                            ))}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-900/80 border border-rose-600 text-rose-200 text-[11px] font-bold hover:bg-rose-800 transition-colors flex items-center gap-1"
                          >
                            <ShieldAlert className="w-3 h-3" /> Revoke
                          </button>
                        )}
                        {pharmacy.status === 'REVOKED' && (
                          <span className="text-[10px] text-rose-500 font-mono">Blocked — cannot receive stock</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400">
              <strong className="text-purple-300">Dispatch Gate:</strong> Only pharmacies with <strong className="text-emerald-400">VERIFIED</strong> status can receive stock dispatch from this distributor hub.
              PENDING pharmacies must complete government ID submission. REVOKED licenses are auto-blocked from all incoming transfers.
            </p>
          </div>
        </div>
      )}

      {/* Receive / Quantity Reconciliation Modal */}
      {selectedShipment && (
        <Modal
          isOpen={Boolean(selectedShipment)}
          onClose={() => setSelectedShipment(null)}
          title={`Intake Reconciliation: Batch ${selectedShipment.batch_number}`}
          subtitle={`Dispatched from ${selectedShipment.sender_org}`}
        >
          {receiveSuccess ? (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Shipment Reconciled & Accepted</h4>
              <p className="text-xs text-slate-400">
                Added {(receivedQtyInput ?? 0).toLocaleString()} units of {selectedShipment.medicine_name} into distributor inventory.
              </p>

              {receivedQtyInput !== selectedShipment.expected_quantity && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-600/60 text-xs text-rose-300 font-mono">
                  🚨 HIGH DISCREPANCY ALERT GENERATED: Variance of {receivedQtyInput - selectedShipment.expected_quantity} units flagged in national audit ledger.
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setSelectedShipment(null)}
                  className="flex-1 py-2 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const bNum = selectedShipment.batch_number;
                    setSelectedShipment(null);
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
            <form onSubmit={handleConfirmReceive} className="space-y-4">
              {receiveError && (
                <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{receiveError}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Product:</span>
                  <span className="text-white font-sans font-bold">{selectedShipment.medicine_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Waybill Expected:</span>
                  <span className="text-cyan-300 font-bold">{(selectedShipment.expected_quantity ?? 0).toLocaleString()} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Expiry Date:</span>
                  <span className="text-slate-200">{selectedShipment.expiry_date}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Physical Received Count (Verified)
                </label>
                <input
                  type="number"
                  min="0"
                  value={receivedQtyInput}
                  onChange={(e) => setReceivedQtyInput(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-mono font-bold text-base"
                />
              </div>

              {/* Dynamic Discrepancy Preview */}
              <div className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between ${
                receivedQtyInput !== (selectedShipment.expected_quantity ?? 0)
                  ? 'bg-rose-950/50 border-rose-700/60 text-rose-300'
                  : 'bg-emerald-950/50 border-emerald-700/60 text-emerald-300'
              }`}>
                <span>Variance:</span>
                <span className="font-bold">
                  {receivedQtyInput - (selectedShipment.expected_quantity ?? 0) === 0
                    ? '0 MATCH (VERIFIED)'
                    : `${receivedQtyInput - (selectedShipment.expected_quantity ?? 0) > 0 ? '+' : ''}${receivedQtyInput - (selectedShipment.expected_quantity ?? 0)} UNITS (DISCREPANCY ALERT)`}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Receiving Inspector Inspection Notes
                </label>
                <textarea
                  rows={2}
                  value={receivingNotes}
                  onChange={(e) => setReceivingNotes(e.target.value)}
                  placeholder="e.g. Tamper seals verified intact. Thermal cold-chain log within specs."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedShipment(null)}
                  className="flex-1 py-2 px-3 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReceiving}
                  className="flex-1 py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isReceiving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{isReceiving ? 'Reconciling...' : 'Confirm & Accept Intake'}</span>
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Dispatch to Pharmacy Modal */}
      {showDispatchModal && (
        <Modal
          isOpen={showDispatchModal}
          onClose={() => setShowDispatchModal(false)}
          title="Dispatch Stock to Licensed Pharmacy"
          subtitle="Generate cryptographic outbound custody manifest"
        >
          {dispatchSuccess ? (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Outbound Transfer Created</h4>
              <p className="text-xs text-slate-400">
                Dispatched {(dispatchQty ?? 0).toLocaleString()} units to pharmacy custody route.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowDispatchModal(false)}
                  className="flex-1 py-2 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowDispatchModal(false);
                    navigate(`/batches/${dispatchSuccess.batch_number || dispatchBatchId}`);
                  }}
                  className="flex-1 py-2 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 flex items-center justify-center gap-1"
                >
                  <span>Inspect Passport</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleConfirmDispatch} className="space-y-4">
              {dispatchError && (
                <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{dispatchError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Source Stock Batch
                </label>
                <select
                  value={dispatchBatchId}
                  onChange={(e) => setDispatchBatchId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {inventoryRecords.map((r) => (
                    <option key={r.batch_id} value={r.batch_id}>
                      {r.batch_number} — {r.medicine_brand_name} ({r.quantity_available} units available)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Licensed Destination Pharmacy
                </label>
                <select
                  value={dispatchTargetOrg}
                  onChange={(e) => setDispatchTargetOrg(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="org_medplus_retail">MedPlus Central Pharmacy #104 (Bengaluru)</option>
                  <option value="org_apollo_pharmacy">Apollo Hospital Pharmacy Unit 1</option>
                  <option value="org_city_clinic">City Health Pharmacy & Dispensary</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Dispatch Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={dispatchQty}
                  onChange={(e) => setDispatchQty(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-mono font-bold text-base"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Transport Manifest & Carrier Notes
                </label>
                <textarea
                  rows={2}
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDispatchModal(false)}
                  className="flex-1 py-2 px-3 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDispatching}
                  className="flex-1 py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isDispatching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{isDispatching ? 'Dispatching...' : 'Confirm Outbound Dispatch'}</span>
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
};

export default DistributorPage;
