import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertOctagon, Filter, CheckCircle2 } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import AlertCard from '../components/ui/AlertCard';
import FilterBar from '../components/ui/FilterBar';
import alertService from '../services/alertService';
import { SystemAlert } from '../mocks/mockData';

export const AlertCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    alertService.getAlerts(severityFilter).then(res => setAlerts(res));
  }, [severityFilter]);

  const handleAcknowledge = async (id: string) => {
    await alertService.acknowledgeAlert(id);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isAcknowledged: true } : a));
  };

  const filtered = alerts.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.description.toLowerCase().includes(search.toLowerCase()) ||
    (a.batchNumber && a.batchNumber.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central Regulatory Alert & Incident Hub"
        description="Unified real-time event log streaming critical re-entry alerts, custody breaches, and regulatory safety notifications"
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-rose-950/60 border border-rose-500/50 text-rose-400">
            National Sentinel Dispatch
          </span>
        }
      />

      {/* Filter Bar */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search alerts by Batch ID, Title, or Incident Description..."
        filters={[
          {
            label: 'Severity',
            value: severityFilter,
            onChange: setSeverityFilter,
            options: [
              { label: 'All Severities', value: 'ALL' },
              { label: 'Critical Only', value: 'CRITICAL' },
              { label: 'High Priority', value: 'HIGH' },
              { label: 'Medium Priority', value: 'MEDIUM' },
              { label: 'Informational', value: 'INFO' },
            ],
          },
        ]}
      />

      {/* Alerts Feed */}
      <div className="space-y-4">
        {filtered.map(alert => (
          <AlertCard
            key={alert.id}
            {...alert}
            onAcknowledge={handleAcknowledge}
            onViewDetails={bNum => navigate(bNum ? `/batches/${bNum}` : '/re-entry')}
          />
        ))}
      </div>
    </div>
  );
};

export default AlertCenterPage;
