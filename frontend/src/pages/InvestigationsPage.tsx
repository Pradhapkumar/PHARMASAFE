import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FolderSearch, Plus, Filter, ShieldAlert, AlertTriangle, CheckCircle2, 
  Clock, ArrowRight, UserCheck, Search, Shield, ChevronRight, FileText
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { InvestigationCaseSummary, CasePriority, CaseStatus } from '../types/api';

export default function InvestigationsPage() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<InvestigationCaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // New Case Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCase, setNewCase] = useState({
    case_id: `INV-2026-C${Math.floor(1000 + Math.random() * 9000)}`,
    title: '',
    description: '',
    priority: 'HIGH' as CasePriority,
    batch_id: '',
    assigned_to_name: 'Special Agent Vikram Malhotra',
    assigned_role: 'Lead Regulatory Auditor'
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadCases();
  }, [statusFilter, priorityFilter]);

  const loadCases = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getInvestigations({
        status: statusFilter,
        priority: priorityFilter
      });
      setCases(data);
    } catch (err) {
      console.error('Failed to load investigations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCase.title.trim()) return;
    setCreating(true);
    try {
      await apiClient.createInvestigationCase(newCase);
      setIsModalOpen(false);
      setNewCase({
        case_id: `INV-2026-C${Math.floor(1000 + Math.random() * 9000)}`,
        title: '',
        description: '',
        priority: 'HIGH',
        batch_id: '',
        assigned_to_name: 'Special Agent Vikram Malhotra',
        assigned_role: 'Lead Regulatory Auditor'
      });
      loadCases();
    } catch (err: any) {
      alert(`Error creating case: ${err.message || 'Validation failed'}`);
    } finally {
      setCreating(false);
    }
  };

  const filteredCases = cases.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.case_id.toLowerCase().includes(term) ||
      c.title.toLowerCase().includes(term) ||
      (c.batch_id && c.batch_id.toLowerCase().includes(term))
    );
  });

  const criticalCount = cases.filter(c => c.priority === 'CRITICAL').length;
  const openCount = cases.filter(c => c.status === 'OPEN' || c.status === 'IN_PROGRESS').length;
  const resolvedCount = cases.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED').length;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <FolderSearch className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">Forensic Investigations Workspace</h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Phase 11
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                Multi-phase evidentiary dossiers, package OCR verifications, tamper audit trails, and sovereign reporting
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold text-sm rounded-lg shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Open Investigation</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Active Cases</span>
            <FolderSearch className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{cases.length}</div>
          <div className="text-xs text-slate-500 mt-1">Across forward & reverse logistics</div>
        </div>

        <div className="p-5 bg-slate-900/60 border border-rose-900/30 rounded-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-400 uppercase tracking-wider">Critical Priority</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-300">{criticalCount}</div>
          <div className="text-xs text-rose-500/80 mt-1">Includes Master Case INV-2026-B1001</div>
        </div>

        <div className="p-5 bg-slate-900/60 border border-amber-900/30 rounded-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">Under Active Review</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-300">{openCount}</div>
          <div className="text-xs text-amber-500/80 mt-1">Evidentiary chain-of-custody active</div>
        </div>

        <div className="p-5 bg-slate-900/60 border border-emerald-900/30 rounded-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Resolved / Closed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-300">{resolvedCount}</div>
          <div className="text-xs text-emerald-500/80 mt-1">Statutory archive sealed</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/50 p-4 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <div className="flex items-center gap-1 bg-slate-950/70 p-1 border border-slate-800 rounded-lg text-xs">
            {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  statusFilter === tab
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.replace('_', ' ')}
              </button>
            ))}
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Filter investigations by priority"
            className="px-3 py-1.5 bg-slate-950/70 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-amber-500/50"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Case ID, Batch, Title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950/70 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading forensic dossiers...</div>
        ) : filteredCases.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FolderSearch className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p>No investigation cases found matching filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Case ID</th>
                  <th className="py-3 px-4">Subject & Description</th>
                  <th className="py-3 px-4">Target Batch</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">AI Risk Score</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned Investigator</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredCases.map(c => {
                  const isCritical = c.priority === 'CRITICAL';
                  return (
                    <tr 
                      key={c.id} 
                      onClick={() => navigate(`/investigations/${c.case_id}`)}
                      className={`hover:bg-slate-800/40 transition-colors cursor-pointer ${
                        c.case_id === 'INV-2026-B1001' ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-amber-400 flex items-center gap-1.5">
                        {c.case_id}
                        {c.case_id === 'INV-2026-B1001' && (
                          <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-[10px] rounded border border-amber-500/30">
                            MASTER
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-200">{c.title}</div>
                        <div className="text-slate-400 text-[11px] truncate max-w-xs">{c.description}</div>
                      </td>
                      <td className="py-3 px-4">
                        {c.batch_id ? (
                          <span className="font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {c.batch_id}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] border ${
                          isCritical
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse'
                            : c.priority === 'HIGH'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {c.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono font-bold ${
                            c.risk_score >= 0.8 ? 'text-rose-400' : c.risk_score >= 0.5 ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {(c.risk_score * 100).toFixed(0)}%
                          </span>
                          <span className="text-[10px] text-slate-500">({c.risk_level})</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60">
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                          <span>{c.assigned_to_name || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/investigations/${c.case_id}`);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 text-[11px] font-medium inline-flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <span>Dossier</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Case Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FolderSearch className="w-5 h-5 text-amber-400" />
                <span>Open Forensic Case</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Case Identifier</label>
                <input
                  type="text"
                  value={newCase.case_id}
                  disabled
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Case Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tampered Hologram Audit on B1001"
                  value={newCase.title}
                  onChange={(e) => setNewCase({ ...newCase, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Target Batch ID / Batch Number</label>
                <input
                  type="text"
                  placeholder="e.g. B1001 or btc_b1001_flagship"
                  value={newCase.batch_id}
                  onChange={(e) => setNewCase({ ...newCase, batch_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Priority</label>
                  <select
                    value={newCase.priority}
                    onChange={(e) => setNewCase({ ...newCase, priority: e.target.value as CasePriority })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Lead Investigator</label>
                  <input
                    type="text"
                    value={newCase.assigned_to_name}
                    onChange={(e) => setNewCase({ ...newCase, assigned_to_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Initial Forensic Summary</label>
                <textarea
                  rows={3}
                  placeholder="Describe the initiating alert, suspect diversion, or packaging mismatch details..."
                  value={newCase.description}
                  onChange={(e) => setNewCase({ ...newCase, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {creating ? 'Opening Case...' : 'Create Forensic Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
