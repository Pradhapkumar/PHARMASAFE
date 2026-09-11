import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skull, ShieldAlert, Search, AlertOctagon, ExternalLink, ShieldCheck } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import DataTable, { Column } from '../components/ui/DataTable';
import FilterBar from '../components/ui/FilterBar';
import StatusBadge from '../components/ui/StatusBadge';
import certificateService from '../services/certificateService';
import apiClient from '../services/apiClient';
import { DeadBatch } from '../types/api';

export const DeadBatchRegistryPage: React.FC = () => {
  const navigate = useNavigate();
  const [deadBatches, setDeadBatches] = useState<DeadBatch[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadData = async () => {
      // Try backend API first
      try {
        const liveBatches = await apiClient.getDeadBatches();
        if (liveBatches && liveBatches.length > 0) {
          setDeadBatches(liveBatches);
          return;
        }
      } catch (_) {}
      // Fallback to mock
      certificateService.getDeadBatches().then(res => setDeadBatches(res));
    };
    loadData();
  }, []);

  const filtered = deadBatches.filter(b =>
    b.batch_number.toLowerCase().includes(search.toLowerCase()) ||
    b.manufacturer_name.toLowerCase().includes(search.toLowerCase()) ||
    b.destruction_cert_hash.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<DeadBatch>[] = [
    {
      key: 'batch_number',
      header: 'Dead Batch ID',
      sortable: true,
      render: item => (
        <div className="flex items-center gap-2">
          <Skull className="w-4 h-4 text-red-400 shrink-0" />
          <span className="font-mono font-bold text-white tracking-wider">{item.batch_number}</span>
        </div>
      ),
    },
    {
      key: 'manufacturer_name',
      header: 'Manufacturer',
      sortable: true,
      render: item => <span className="text-slate-300 font-medium">{item.manufacturer_name}</span>,
    },
    {
      key: 'quantity_destroyed',
      header: 'Destroyed Units',
      sortable: true,
      render: item => <span className="font-mono text-slate-300">{item.quantity_destroyed.toLocaleString()}</span>,
    },
    {
      key: 'destroyed_at',
      header: 'Destruction Date',
      sortable: true,
      render: item => <span className="font-mono text-xs text-slate-400">{item.destroyed_at.split('T')[0]}</span>,
    },
    {
      key: 'reentry_attempts_count',
      header: 'Re-Entry Violations',
      sortable: true,
      render: item => {
        if (item.reentry_attempts_count > 0) {
          return (
            <span className="px-2.5 py-0.5 rounded-full bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-mono font-bold inline-flex items-center gap-1 animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{item.reentry_attempts_count} INTERCEPTED</span>
            </span>
          );
        }
        return <span className="font-mono text-slate-500 text-xs">0 Attempts</span>;
      },
    },
    {
      key: 'status',
      header: 'Registry Status',
      render: () => <StatusBadge status="DEAD_BATCH" size="sm" />,
    },
    {
      key: 'actions',
      header: 'Inspection',
      render: item => (
        <button
          onClick={() => navigate('/re-entry')}
          className="text-cyan-400 hover:text-cyan-300 font-semibold text-xs flex items-center gap-1"
        >
          <span>Surveillance Feed</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dead Batch National Registry"
        description="Immutable cryptographic blacklist of all destroyed, recalled, or revoked pharmaceutical batches. Any physical scan or commercial transaction triggers an instant Critical Re-Entry Sentinel violation."
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-red-950/60 border border-red-500/50 text-red-400 animate-pulse">
            🚨 Permanent Blacklist Active
          </span>
        }
      />

      {/* Warning Notice Card */}
      <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/40 flex items-start gap-3 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
        <AlertOctagon className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-red-200">
            Mandatory Drug Enforcement Regulatory Directive § 14-B
          </h4>
          <p className="text-xs text-red-300/80 mt-1 leading-relaxed">
            All batches cataloged below have undergone verified physical destruction or mandatory safety revocation. Automated sentinel nodes actively listen across 14,000+ registered hospital/pharmacy point-of-care scanners and 8 online e-commerce channels.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter Dead Batches by Batch ID, Manufacturer, or Certificate Hash..."
      />

      {/* Dead Batch Data Table */}
      <DataTable
        columns={columns}
        data={filtered}
        keyField="id"
        onRowClick={item => navigate(`/batches/${item.batch_number}`)}
      />
    </div>
  );
};

export default DeadBatchRegistryPage;
