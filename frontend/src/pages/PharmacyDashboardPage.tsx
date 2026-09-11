import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Building2, AlertTriangle, CheckCircle2, Boxes, ArrowRight, ShieldAlert,
  Search, Filter, ExternalLink, QrCode, RefreshCw, Layers, ShieldCheck,
  Calendar, ShoppingBag, Eye, Ban, Truck, Clock, Sparkles
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import LoadingState from '../components/ui/LoadingState';
import inventoryService, { InboundShipmentItem } from '../services/inventoryService';
import dashboardService from '../services/dashboardService';
import { InventoryRecord } from '../types/api';

export const PharmacyDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'operations' | 'incoming' | 'inventory') || 'operations';
  const [activeTab, setActiveTab] = useState<'operations' | 'incoming' | 'inventory'>(initialTab);

  // Data States
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [inboundItems, setInboundItems] = useState<InboundShipmentItem[]>([]);
  const [inventoryRecords, setInventoryRecords] = useState<InventoryRecord[]>([]);

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

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [dash, inbound, inv] = await Promise.all([
        dashboardService.getPharmacyDashboard(),
        inventoryService.getInboundShipments(),
        inventoryService.getInventory(statusFilter === 'ALL' ? undefined : statusFilter, search || undefined),
      ]);
      setDashboardData(dash);
      setInboundItems(inbound);
      setInventoryRecords(inv);
    } catch (err) {
      console.error('Error loading pharmacy data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [statusFilter]);

  const handleTabChange = (tab: 'operations' | 'incoming' | 'inventory') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Open Receive Modal
  const handleOpenReceive = (shipment: InboundShipmentItem) => {
    setSelectedShipment(shipment);
    setReceivedQtyInput(shipment.quantity ?? shipment.expected_quantity ?? 0);
    setReceivingNotes(`Verified by MedPlus pharmacist on intake.`);
    setReceiveError(null);
    setReceiveSuccess(null);
  };

  // Submit Receiving / Reconcile
  const handleConfirmReceive = async () => {
    if (!selectedShipment) return;
    setIsReceiving(true);
    setReceiveError(null);
    try {
      const res = await inventoryService.receiveTransfer(
        selectedShipment.id,
        receivedQtyInput,
        receivingNotes
      );
      setReceiveSuccess(res);
      await loadAllData();
    } catch (err: any) {
      setReceiveError(err.message || 'Failed to complete physical receiving.');
    } finally {
      setIsReceiving(false);
    }
  };

  // Filter shelf inventory
  const filteredInventory = inventoryRecords.filter(item => {
    if (search) {
      const q = search.toLowerCase();
      const matchBatch = item.batch_number?.toLowerCase().includes(q);
      const matchName = item.medicine_name?.toLowerCase().includes(q);
      const matchGtin = item.gtin_barcode?.toLowerCase().includes(q);
      if (!matchBatch && !matchName && !matchGtin) return false;
    }
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'EXPIRED' && !item.is_expired) return false;
      if (statusFilter === 'RECALLED' && !item.is_recalled) return false;
      if (statusFilter === 'ACTIVE' && (item.is_expired || item.is_recalled)) return false;
    }
    return true;
  });

  const discrepancy = selectedShipment ? receivedQtyInput - (selectedShipment.quantity ?? selectedShipment.expected_quantity ?? 0) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Pharmacy Operations & Dispensary Hub"
        description="Zero-trust pharmacy dispensary hub with physical receiving reconciliation, active shelf inventory, and pre-dispensing batch validation"
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
            MedPlus Pharmacy #BLR-882 • Dispensing Node
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/pharmacy/verify')}
              className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)]"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Point-of-Care Scanner</span>
            </button>
            <button
              onClick={loadAllData}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Refresh ledger state"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        }
      />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
        <button
          onClick={() => handleTabChange('operations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'operations'
              ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] font-bold'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Operations Terminal</span>
        </button>
        <button
          onClick={() => handleTabChange('incoming')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'incoming'
              ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] font-bold'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Incoming Deliveries</span>
          {inboundItems.filter(i => !i.is_confirmed).length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold">
              {inboundItems.filter(i => !i.is_confirmed).length}
            </span>
          )}
        </button>
        <button
          onClick={() => handleTabChange('inventory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'inventory'
              ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] font-bold'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>Shelf Inventory</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300">
            {inventoryRecords.length}
          </span>
        </button>
      </div>

      {/* TAB 1: OPERATIONS TERMINAL */}
      {activeTab === 'operations' && (
        <div className="space-y-6">
          {/* Key Metrics Ribbon */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-mono uppercase tracking-wider">Active Shelf Stock</span>
                <Boxes className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                {dashboardData?.active_stock_units ?? dashboardData?.total_inventory_units ?? 500} <span className="text-xs font-normal text-slate-400">units</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                {dashboardData?.active_stock_batches ?? 1} batch authorized for sale
              </div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-mono uppercase tracking-wider">Incoming Shipments</span>
                <Truck className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                {dashboardData?.incoming_shipments_count ?? inboundItems.filter(i => !i.is_confirmed).length}
              </div>
              <div className="text-[11px] text-cyan-400 mt-1 font-mono">
                Awaiting physical intake count
              </div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-mono uppercase tracking-wider">Near-Expiry / Expired</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-400 font-mono">
                {(dashboardData?.near_expiry_count || 0) + (dashboardData?.expired_count || 0)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                {dashboardData?.expired_count || 0} expired (auto-blocked)
              </div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-mono uppercase tracking-wider">Return-Ready / Blocked</span>
                <ShieldAlert className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-bold text-rose-400 font-mono">
                {dashboardData?.return_ready_count ?? 1}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                Quarantined for reverse return
              </div>
            </div>
          </div>

          {/* Quick Action Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              onClick={() => navigate('/pharmacy/verify')}
              className="glass-panel p-5 rounded-2xl border border-cyan-500/30 hover:border-cyan-500/60 bg-gradient-to-br from-cyan-950/20 to-slate-900/60 cursor-pointer transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 group-hover:scale-110 transition-transform">
                  <QrCode className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Optical Verification Scanner</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Scan patient box or blister strip barcodes prior to dispensing. Cross-references GS1 ledger & Dead Batch Registry.
              </p>
            </div>

            <div 
              onClick={() => handleTabChange('incoming')}
              className="glass-panel p-5 rounded-2xl border border-emerald-500/30 hover:border-emerald-500/60 bg-gradient-to-br from-emerald-950/20 to-slate-900/60 cursor-pointer transition-all hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 group-hover:scale-110 transition-transform">
                  <Truck className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Inbound Delivery Intake</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Reconcile physical counts vs distributor manifests. Confirms transfer of custody with zero-trust variance checks.
              </p>
            </div>

            <div 
              onClick={() => navigate('/returns')}
              className="glass-panel p-5 rounded-2xl border border-rose-500/30 hover:border-rose-500/60 bg-gradient-to-br from-rose-950/20 to-slate-900/60 cursor-pointer transition-all hover:shadow-[0_0_20px_rgba(244,63,94,0.15)] group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 group-hover:scale-110 transition-transform">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Reverse Logistics & Returns</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Initiate reverse chain return for expired stock (e.g. B1003) or manufacturer recalled lots (e.g. B1004).
              </p>
            </div>
          </div>

          {/* Pending Shipments Quick List */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-400" />
                <span>Pending Deliveries Awaiting Pharmacy Intake ({inboundItems.filter(i => !i.is_confirmed).length})</span>
              </h3>
              <button
                onClick={() => handleTabChange('incoming')}
                className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>View All Deliveries</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {inboundItems.filter(i => !i.is_confirmed).length === 0 ? (
              <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/60" />
                <p className="text-xs">No pending inbound deliveries. All received shipments are fully reconciled.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {inboundItems.filter(i => !i.is_confirmed).slice(0, 3).map(shipment => (
                  <div 
                    key={shipment.id}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4 hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-sm">{shipment.batch_number}</span>
                        <span className="text-xs text-slate-400 font-medium">• {shipment.medicine_name}</span>
                        <StatusBadge status="IN_TRANSIT" />
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-4">
                        <span>From: <strong className="text-slate-300">{shipment.source_org_name || 'Apex Pharma Wholesale'}</strong></span>
                        <span>Manifest Qty: <strong className="text-emerald-400 font-mono">{shipment.quantity ?? shipment.expected_quantity} units</strong></span>
                        <span>Sent: {new Date(shipment.dispatched_at || shipment.timestamp || Date.now()).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenReceive(shipment)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-all shadow-[0_0_12px_rgba(16,185,129,0.2)] shrink-0"
                    >
                      Verify & Receive
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INCOMING DELIVERIES */}
      {activeTab === 'incoming' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Inbound Custody Transfers & Deliveries
              </h3>
              <p className="text-xs text-slate-400">
                All consignments routed to MedPlus Pharmacy from upstream distributors. Verify physical boxes before signing custody receipt.
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-lg self-start">
              Zero-Trust Intake Verification
            </span>
          </div>

          {inboundItems.length === 0 ? (
            <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
              <Truck className="w-10 h-10 mx-auto mb-2 text-slate-700" />
              <p className="text-xs">No inbound deliveries recorded for this pharmacy.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                    <th className="pb-3 pl-2">Batch Number</th>
                    <th className="pb-3">Medicine Details</th>
                    <th className="pb-3">Origin Distributor</th>
                    <th className="pb-3 text-right">Manifest Qty</th>
                    <th className="pb-3 text-center">Transfer Status</th>
                    <th className="pb-3 text-right pr-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {inboundItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 pl-2">
                        <div className="font-mono font-bold text-cyan-400 text-xs">
                          {item.batch_number}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          GTIN: {item.gtin_barcode || '890108800101'}
                        </div>
                      </td>
                      <td className="py-3.5">
                        <div className="text-white font-semibold">{item.medicine_name}</div>
                        <div className="text-[10px] text-slate-400">Exp: {item.expiry_date}</div>
                      </td>
                      <td className="py-3.5 text-slate-300">
                        {item.source_org_name || 'Apex Pharma Wholesale'}
                      </td>
                      <td className="py-3.5 text-right font-mono font-bold text-white">
                        {item.quantity ?? item.expected_quantity} <span className="text-[10px] font-normal text-slate-400">units</span>
                      </td>
                      <td className="py-3.5 text-center">
                        {item.is_confirmed ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>RECEIVED</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950/80 border border-amber-500/40 text-amber-300">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>IN TRANSIT</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        {item.is_confirmed ? (
                          <button
                            onClick={() => navigate(`/batches/${item.batch_number}`)}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-cyan-300 text-[11px] font-semibold flex items-center gap-1 ml-auto"
                          >
                            <span>Passport</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenReceive(item)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition-colors shadow-[0_0_10px_rgba(16,185,129,0.2)] ml-auto"
                          >
                            Verify & Receive
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SHELF INVENTORY */}
      {activeTab === 'inventory' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Active Dispensary Shelf Inventory
              </h3>
              <p className="text-xs text-slate-400">
                On-premise stock verified for Point-of-Sale dispensing. Quarantined stock is automatically flagged for reverse logistics.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2">
              {['ALL', 'ACTIVE', 'EXPIRED', 'RECALLED'].map(filterOption => (
                <button
                  key={filterOption}
                  onClick={() => setStatusFilter(filterOption)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-colors ${
                    statusFilter === filterOption
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {filterOption}
                </button>
              ))}
            </div>
          </div>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search batch number, brand name, or GTIN barcode..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {filteredInventory.length === 0 ? (
            <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
              <Boxes className="w-10 h-10 mx-auto mb-2 text-slate-700" />
              <p className="text-xs">No inventory matches your search filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInventory.map(item => (
                <div 
                  key={item.id}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-cyan-400 text-sm">{item.batch_number}</span>
                        {item.is_expired ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-950 text-rose-400 border border-rose-600/40">
                            EXPIRED
                          </span>
                        ) : item.is_recalled ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-950 text-amber-400 border border-amber-600/40">
                            RECALLED
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-600/40">
                            DISPENSABLE
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-semibold text-white mt-1">{item.medicine_name || 'Paracetamol 500mg IP'}</h4>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      Shelf: {item.location || 'Aisle 2 - Shelf B'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px] font-mono">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Available</span>
                      <strong className="text-emerald-400 text-sm">{item.quantity}</strong> units
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Expiry Date</span>
                      <strong className={item.is_expired ? 'text-rose-400' : 'text-slate-300'}>
                        {item.expiry_date}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => navigate(`/pharmacy/verify`)}
                      className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Test Scan</span>
                    </button>
                    <button
                      onClick={() => navigate(`/batches/${item.batch_number}`)}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      <span>Digital Passport</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* RECEIVING / RECONCILIATION MODAL */}
      <Modal
        isOpen={!!selectedShipment}
        onClose={() => setSelectedShipment(null)}
        title="Inbound Physical Intake & Reconciliation"
      >
        {selectedShipment && (
          <div className="space-y-5">
            {receiveSuccess ? (
              <div className="space-y-4 py-2 text-center">
                <div className="p-3 rounded-full bg-emerald-500/20 text-emerald-400 w-12 h-12 mx-auto flex items-center justify-center border border-emerald-500/40">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Consignment Received & Ingested</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Physical count reconciled. Custody officially transferred to MedPlus Pharmacy dispensary ledger.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-left space-y-2 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Batch ID:</span>
                    <strong className="text-cyan-400">{receiveSuccess.batch_number || selectedShipment.batch_number}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Reconciled Count:</span>
                    <strong className="text-emerald-400">{receiveSuccess.quantity} units</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Variance:</span>
                    <strong className={receiveSuccess.discrepancy !== 0 ? 'text-amber-400' : 'text-slate-300'}>
                      {receiveSuccess.discrepancy > 0 ? `+${receiveSuccess.discrepancy}` : receiveSuccess.discrepancy} units
                    </strong>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      setSelectedShipment(null);
                      setReceiveSuccess(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      const bNum = selectedShipment.batch_number;
                      setSelectedShipment(null);
                      setReceiveSuccess(null);
                      navigate(`/batches/${bNum}`);
                    }}
                    className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400"
                  >
                    View Passport Milestone
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Consignment Metadata */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-mono">Batch Number:</span>
                    <strong className="text-cyan-400 font-mono">{selectedShipment.batch_number}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-mono">Medicine:</span>
                    <span className="text-white font-semibold">{selectedShipment.medicine_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-mono">Shipped From:</span>
                    <span className="text-slate-300">{selectedShipment.source_org_name || 'Apex Pharma Wholesale'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-mono">Manifest Expected Qty:</span>
                    <strong className="text-white font-mono text-sm">{selectedShipment.quantity ?? selectedShipment.expected_quantity} units</strong>
                  </div>
                </div>

                {/* Count Input */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                    Physical Count Verified (Boxes / Strips)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={receivedQtyInput}
                    onChange={e => setReceivedQtyInput(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Live Reconciliation Indicator */}
                <div className={`p-3.5 rounded-xl border text-xs ${
                  discrepancy === 0
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                }`}>
                  <div className="flex items-start gap-2.5">
                    {discrepancy === 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <strong>
                        {discrepancy === 0
                          ? 'Exact Reconciliation Match'
                          : `Variance Detected: ${discrepancy > 0 ? `+${discrepancy}` : discrepancy} units`}
                      </strong>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {discrepancy === 0
                          ? 'Physical count matches distributor manifest exactly. Custody will transfer with zero flags.'
                          : 'A discrepancy alert will be automatically published to the audit log and alert center.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes Input */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                    Pharmacist Verification Notes
                  </label>
                  <input
                    type="text"
                    value={receivingNotes}
                    onChange={e => setReceivingNotes(e.target.value)}
                    placeholder="Enter intake notes..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {receiveError && (
                  <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-xs text-rose-300">
                    {receiveError}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setSelectedShipment(null)}
                    disabled={isReceiving}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmReceive}
                    disabled={isReceiving}
                    className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                  >
                    {isReceiving ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Confirm Physical Intake'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PharmacyDashboardPage;
