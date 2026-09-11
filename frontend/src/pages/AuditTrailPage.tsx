import React, { useState, useEffect } from 'react';
import { History, Download, Filter, Search } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import DataTable, { Column } from '../components/ui/DataTable';
import FilterBar from '../components/ui/FilterBar';
import auditService from '../services/auditService';
import { AuditEvent } from '../mocks/mockData';

export const AuditTrailPage: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    auditService.getAuditEvents(entityFilter).then(res => setEvents(res));
  }, [entityFilter]);

  const filtered = events.filter(e =>
    e.action.toLowerCase().includes(search.toLowerCase()) ||
    e.entityId.toLowerCase().includes(search.toLowerCase()) ||
    e.user.toLowerCase().includes(search.toLowerCase()) ||
    e.organization.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<AuditEvent>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp (UTC)',
      sortable: true,
      render: item => <span className="font-mono text-xs text-slate-400">{item.timestamp}</span>,
    },
    {
      key: 'user',
      header: 'Actor & Role',
      sortable: true,
      render: item => (
        <div>
          <strong className="text-white text-xs block">{item.user}</strong>
          <span className="text-[10px] text-slate-400 font-mono">{item.role} • {item.organization}</span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Operation Action',
      sortable: true,
      render: item => (
        <span className="font-mono font-bold text-xs text-cyan-400">
          {item.action}
        </span>
      ),
    },
    {
      key: 'entityId',
      header: 'Target Entity',
      sortable: true,
      render: item => (
        <div className="font-mono">
          <span className="text-slate-400 text-[10px] block">{item.entity}</span>
          <strong className="text-white text-xs">{item.entityId}</strong>
        </div>
      ),
    },
    {
      key: 'result',
      header: 'Ledger Result',
      sortable: true,
      render: item => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
          item.result === 'SUCCESS' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
          item.result === 'WARNING' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
          'bg-rose-950 text-rose-400 border border-rose-800'
        }`}>
          {item.result}
        </span>
      ),
    },
    {
      key: 'details',
      header: 'Audit Evidence Details',
      render: item => <span className="text-xs text-slate-300 line-clamp-2 max-w-sm">{item.details}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Immutable Compliance Audit Trail"
        description="Cryptographic, tamper-evident transaction log recording all forward distribution custody, return manifests, and certified bio-hazard destructions"
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
            Append-Only Secure Ledger
          </span>
        }
        actions={
          <button
            onClick={() => alert('Exporting signed audit ledger snapshot (CSV / PDF)...')}
            className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Signed CSV Snapshot</span>
          </button>
        }
      />

      {/* Filter Bar */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter audit events by Actor, Batch ID, or Action..."
        filters={[
          {
            label: 'Entity',
            value: entityFilter,
            onChange: setEntityFilter,
            options: [
              { label: 'All Entities', value: 'ALL' },
              { label: 'Batches Only', value: 'BATCH' },
              { label: 'Returns Only', value: 'RETURN' },
              { label: 'Certificates', value: 'CERTIFICATE' },
            ],
          },
        ]}
      />

      {/* Audit Data Table */}
      <DataTable
        columns={columns}
        data={filtered}
        keyField="id"
      />
    </div>
  );
};

export default AuditTrailPage;
