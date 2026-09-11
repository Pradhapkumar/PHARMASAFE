import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FolderSearch, ArrowLeft, ShieldAlert, ShieldCheck, Clock, FileText, 
  Upload, CheckCircle2, AlertTriangle, Cpu, Copy, Check, Hash, 
  Eye, RefreshCw, AlertOctagon, Scale, Flame, Skull, Globe, User, 
  Send, ExternalLink, Download, FileCode, CheckSquare
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { 
  InvestigationCaseDetail, EvidenceItem, PackageComparisonResult, 
  BatchInvestigationReport, CaseStatus 
} from '../types/api';

export default function InvestigationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [dossier, setDossier] = useState<InvestigationCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Status Change
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // New Note
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isEvidenceFlag, setIsEvidenceFlag] = useState(false);
  const [submittingNote, setSubmittingNote] = useState(false);

  // Upload Evidence
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState('PACKAGE_IMAGE');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  // OCR Comparison Modal / Drawer
  const [comparingEvidence, setComparingEvidence] = useState<EvidenceItem | null>(null);
  const [comparisonResult, setComparisonResult] = useState<PackageComparisonResult | null>(null);
  const [comparing, setComparing] = useState(false);

  // Report Modal
  const [reportData, setReportData] = useState<BatchInvestigationReport | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadDossier(id);
    }
  }, [id]);

  const loadDossier = async (caseId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getInvestigationCase(caseId);
      setDossier(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load investigation dossier.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2500);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!dossier) return;
    setUpdatingStatus(true);
    try {
      const updated = await apiClient.updateInvestigationStatus(
        dossier.case_id,
        newStatus,
        `Status updated to ${newStatus} by Lead Regulatory Auditor.`
      );
      setDossier(updated);
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dossier || !newNoteContent.trim()) return;
    setSubmittingNote(true);
    try {
      const note = await apiClient.addInvestigationNote(dossier.case_id, {
        content: newNoteContent,
        author_name: 'Special Agent Vikram Malhotra',
        author_role: 'Lead Regulatory Auditor',
        is_evidence_flag: isEvidenceFlag,
      });
      setDossier({
        ...dossier,
        notes: [note, ...dossier.notes]
      });
      setNewNoteContent('');
      setIsEvidenceFlag(false);
    } catch (err: any) {
      alert(`Failed to append note: ${err.message}`);
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleUploadEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dossier || !uploadFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('entity_type', 'INVESTIGATION_CASE');
      formData.append('entity_id', dossier.case_id);
      if (dossier.batch_id) formData.append('batch_id', dossier.batch_id);
      formData.append('evidence_type', uploadType);
      if (uploadNotes) formData.append('notes', uploadNotes);

      const ev = await apiClient.uploadEvidence(formData);
      // Link to case
      await apiClient.linkEvidenceToCase(dossier.case_id, {
        evidence_id: ev.evidence_id,
        relevance_notes: uploadNotes || 'Uploaded via Case Dossier workspace'
      });

      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadNotes('');
      // Reload dossier
      loadDossier(dossier.case_id);
    } catch (err: any) {
      alert(`Evidence upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRunComparison = async (ev: EvidenceItem) => {
    if (!dossier) return;
    setComparingEvidence(ev);
    setComparing(true);
    try {
      const res = await apiClient.comparePackageEvidence({
        evidence_id: ev.evidence_id,
        batch_id: dossier.batch_id || 'B1001'
      });
      setComparisonResult(res);
    } catch (err: any) {
      alert(`Comparison failed: ${err.message}`);
    } finally {
      setComparing(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!dossier) return;
    setGeneratingReport(true);
    try {
      const rep = await apiClient.getBatchInvestigationReport(
        dossier.batch_id || 'B1001',
        'Special Agent Vikram Malhotra'
      );
      setReportData(rep);
      setIsReportModalOpen(true);
    } catch (err: any) {
      alert(`Failed to generate report: ${err.message}`);
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 max-w-5xl mx-auto">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-amber-400" />
        <p className="font-medium text-slate-300">Assembling 360° Forensic Case Dossier...</p>
        <p className="text-xs text-slate-500 mt-1">Collating 10 supply-chain phases and SHA-256 evidence vaults</p>
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <div className="p-8 max-w-3xl mx-auto text-center">
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white">Investigation Dossier Not Found</h2>
          <p className="text-sm text-slate-400 mt-1">{error || 'Invalid or missing case reference.'}</p>
          <button
            onClick={() => navigate('/investigations')}
            className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
          >
            ← Back to Investigations List
          </button>
        </div>
      </div>
    );
  }

  const isCritical = dossier.priority === 'CRITICAL';

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/investigations')}
          className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Investigations Workspace</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateReport}
            disabled={generatingReport}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>{generatingReport ? 'Generating Report...' : 'Export Forensic Report'}</span>
          </button>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Attach Evidence</span>
          </button>
        </div>
      </div>

      {/* Case Master Header Banner */}
      <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-xl font-extrabold text-amber-400">{dossier.case_id}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                isCritical 
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {dossier.priority} PRIORITY
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                STATUS: {dossier.status}
              </span>
              {dossier.case_id === 'INV-2026-B1001' && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  FLAGSHIP 10-PHASE MASTER DOSSIER
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-white">{dossier.title}</h1>
            <p className="text-sm text-slate-400 max-w-3xl">{dossier.description}</p>

            <div className="flex items-center gap-6 text-xs text-slate-400 pt-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Target Batch:</span>
                <span className="font-mono text-amber-400 font-semibold">{dossier.batch_id || 'B1001'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>Investigator:</span>
                <span className="text-slate-200 font-medium">{dossier.assigned_to_name || 'Vikram Malhotra'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Opened:</span>
                <span className="text-slate-300">{new Date(dossier.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* AI Risk Score Gauge & Status Actions */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 border-t lg:border-t-0 border-slate-800 pt-4 lg:pt-0">
            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">AI Anomaly Risk Score</div>
              <div className="flex items-center justify-end gap-2 mt-1">
                <span className={`text-2xl font-black font-mono ${
                  dossier.risk_score >= 0.8 ? 'text-rose-400' : 'text-amber-400'
                }`}>
                  {(dossier.risk_score * 100).toFixed(0)}%
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                  dossier.risk_score >= 0.8 ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {dossier.risk_level}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Hard Regulatory Invariant Guarded</div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Update Status:</span>
              <select
                value={dossier.status}
                disabled={updatingStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                <option value="ESCALATED">ESCALATED</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Left Column (Timeline & Provenance) | Right Column (Evidence Vault & Notes) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: 7 cols */}
        <div className="lg:col-span-7 space-y-8">
          {/* Section 1: 10-Phase Chronological Timeline */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold text-white">Chronological 10-Phase Event Timeline</h2>
              </div>
              <span className="text-xs text-slate-400">{dossier.timeline?.length || 0} Synchronized Events</span>
            </div>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
              {dossier.timeline && dossier.timeline.map((event, idx) => {
                const isDestruction = event.phase.includes('DESTRUCTION') || event.phase.includes('DEAD BATCH');
                const isAlert = event.phase.includes('AI') || event.phase.includes('ONLINE');
                const isReverse = event.phase.includes('REVERSE') || event.phase.includes('DISPOSAL');

                return (
                  <div key={idx} className="relative group">
                    <div className={`absolute -left-[27px] top-1 w-4 h-4 rounded-full border-2 bg-slate-950 ${
                      isDestruction ? 'border-rose-500' : isAlert ? 'border-cyan-400' : isReverse ? 'border-amber-500' : 'border-emerald-500'
                    }`} />
                    
                    <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition-colors">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          isDestruction ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          isAlert ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                          isReverse ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {event.phase}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="text-sm font-semibold text-white">{event.title}</div>
                      <p className="text-xs text-slate-300 leading-relaxed">{event.details}</p>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                        <span>Actor / Entity: <strong className="text-slate-300">{event.actor}</strong></span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                          {event.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Visual Provenance Chain of Custody */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-bold text-white">Provenance Custody Chain & Scale Verification</h2>
              </div>
              <span className="text-xs text-slate-400">{dossier.custody_chain?.length || 0} Chain Nodes</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {dossier.custody_chain && dossier.custody_chain.map((node, idx) => (
                <div key={idx} className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-mono uppercase text-cyan-400 font-bold">{node.stage}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                      {node.status}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white">{node.organization}</div>
                  <div className="text-[11px] text-slate-400 truncate">{node.location}</div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-900">
                    <span>Verified Units: <strong className="text-slate-300 font-mono">{node.quantity}</strong></span>
                    <span>Evidence Attached: <strong className="text-amber-400">{node.evidence_count} items</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 5 cols */}
        <div className="lg:col-span-5 space-y-8">
          {/* Section 3: Attached Evidence Items Vault */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold text-white">Evidentiary Vault</h2>
              </div>
              <span className="text-xs text-slate-400">{dossier.evidence_items?.length || 0} Artifacts</span>
            </div>

            <div className="space-y-3">
              {dossier.evidence_items && dossier.evidence_items.map((ev, idx) => (
                <div key={idx} className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-xs font-bold text-amber-400">{ev.evidence_id}</span>
                      <span className="text-xs text-slate-300 font-medium truncate">{ev.title}</span>
                    </div>
                    {ev.is_finalized && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                        FINALIZED
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-400">
                    Type: <span className="text-slate-300">{ev.type}</span>
                  </div>

                  {/* SHA-256 Checksum Badge */}
                  <div className="flex items-center justify-between gap-2 p-2 bg-slate-900 border border-slate-800 rounded text-[10px] font-mono text-slate-400">
                    <div className="flex items-center gap-1 truncate">
                      <Hash className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                      <span className="truncate">{ev.checksum}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(ev.checksum)}
                      className="text-slate-400 hover:text-cyan-300 cursor-pointer flex-shrink-0"
                      title="Copy SHA-256 Checksum"
                    >
                      {copiedHash === ev.checksum ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Actions: OCR Check & Comparison */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">OCR:</span>
                      <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                        ev.ocr_status === 'MATCH' ? 'bg-emerald-500/20 text-emerald-300' :
                        ev.ocr_status === 'REVIEW_REQUIRED' ? 'bg-amber-500/20 text-amber-300' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {ev.ocr_status}
                      </span>
                    </div>

                    <button
                      onClick={() => handleRunComparison(ev as any)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-medium border border-slate-700 transition-colors cursor-pointer"
                    >
                      Compare DB
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Append-Only Investigator Notes Log */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-bold text-white">Investigator Notes (Append-Only)</h2>
              </div>
              <span className="text-xs text-slate-400">{dossier.notes?.length || 0} Entries</span>
            </div>

            {/* Note Input Form */}
            <form onSubmit={handleAddNote} className="space-y-3">
              <textarea
                rows={3}
                required
                placeholder="Record tamper verification observations, suspect chain disclosures, or law enforcement actions..."
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEvidenceFlag}
                    onChange={(e) => setIsEvidenceFlag(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0"
                  />
                  <span>Flag as Critical Evidentiary Finding</span>
                </label>

                <button
                  type="submit"
                  disabled={submittingNote || !newNoteContent.trim()}
                  className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3 h-3" />
                  <span>{submittingNote ? 'Saving...' : 'Add Note'}</span>
                </button>
              </div>
            </form>

            {/* Notes Log */}
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {dossier.notes && dossier.notes.map((note, idx) => (
                <div 
                  key={idx} 
                  className={`p-3.5 rounded-xl border space-y-1.5 ${
                    note.is_evidence_flag 
                      ? 'bg-amber-500/10 border-amber-500/30' 
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-slate-200">{note.author_name}</span>
                    <span className="text-slate-500">{new Date(note.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{note.content}</p>
                  <div className="text-[10px] text-slate-500 font-mono">{note.author_role}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Package Comparison Sandbox Modal */}
      {comparingEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                  <span>Packaging OCR vs Sovereign Baseline Comparison</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Evidence ID: {comparingEvidence.evidence_id}</p>
              </div>
              <button
                onClick={() => {
                  setComparingEvidence(null);
                  setComparisonResult(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {comparing ? (
              <div className="p-8 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
                <p>Performing optical character extraction and database field alignment...</p>
              </div>
            ) : comparisonResult ? (
              <div className="space-y-4 text-xs">
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  comparisonResult.overall_verdict === 'MATCH'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : comparisonResult.overall_verdict === 'REVIEW_REQUIRED'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider">Overall OCR Verdict</span>
                    <div className="text-lg font-black">{comparisonResult.overall_verdict}</div>
                  </div>
                  <span className="text-[11px] max-w-xs text-right">
                    {comparisonResult.overall_verdict === 'MATCH'
                      ? 'Captured package attributes match the registered sovereign batch records.'
                      : 'Discrepancy detected. Flagged for human review without automated counterfeit accusation.'}
                  </span>
                </div>

                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 text-[10px] uppercase text-slate-400">
                        <th className="py-2.5 px-3">Field</th>
                        <th className="py-2.5 px-3">Captured Packaging OCR</th>
                        <th className="py-2.5 px-3">Registered Sovereign DB</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {Object.entries(comparisonResult.comparisons).map(([field, comp]: any) => (
                        <tr key={field} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-semibold text-slate-300 uppercase">{field}</td>
                          <td className="py-2.5 px-3 text-slate-200">{String(comp.captured_val ?? '—')}</td>
                          <td className="py-2.5 px-3 text-slate-200">{String(comp.db_val ?? '—')}</td>
                          <td className="py-2.5 px-3 text-right">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              comp.status === 'MATCH'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}>
                              {comp.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-slate-400">
                  <strong>Regulatory Note:</strong> Optical comparisons provide decision support only. Flagged records mandate physical quarantine and forensic laboratory verification before statutory enforcement.
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Attach Evidence Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-400" />
                <span>Attach Evidentiary Artifact</span>
              </h3>
              <button onClick={() => setIsUploadOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleUploadEvidence} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Select File *</label>
                <input
                  type="file"
                  required
                  onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Evidence Type</label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="PACKAGE_IMAGE">Package Packaging Photo</option>
                  <option value="MEDICINE_INSPECTION_PHOTO">Medicine Visual Inspection Photo</option>
                  <option value="QR_CODE_SNAPSHOT">QR Code Physical Snapshot</option>
                  <option value="MANUFACTURER_COA_PDF">Certificate of Analysis (COA)</option>
                  <option value="TRANSPORT_WAYBILL_SCAN">Transport Waybill Scan</option>
                  <option value="DISPOSAL_SCALE_WEIGHT_RECEIPT">Disposal Scale Weight Receipt</option>
                  <option value="DESTRUCTION_CERTIFICATE_MEDIA">Certified Destruction Media</option>
                  <option value="MARKETPLACE_LISTING_SCREENSHOT">Dark Web / Online Listing Screenshot</option>
                  <option value="FORENSIC_LAB_REPORT">Forensic Lab Chemical Test Report</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Relevance Notes</label>
                <textarea
                  rows={2}
                  placeholder="Explain why this evidence is pertinent to case investigation..."
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg"
                >
                  {uploading ? 'Hashing & Uploading...' : 'Upload & Compute SHA-256'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Forensic Report Modal */}
      {isReportModalOpen && reportData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl p-6 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase text-amber-400 font-bold">
                  {reportData.report_metadata.report_reference}
                </span>
                <h2 className="text-xl font-bold text-white mt-1">Batch Forensic Investigation Report</h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700 font-semibold"
                >
                  Print Report
                </button>
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-6 text-xs text-slate-300">
              {/* Report Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="text-[10px] text-slate-500 uppercase">Batch Identifier</div>
                  <div className="font-mono font-bold text-amber-400 text-sm mt-0.5">
                    {reportData.report_metadata.batch_number}
                  </div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="text-[10px] text-slate-500 uppercase">Statutory Verdict</div>
                  <div className="font-bold text-rose-400 text-sm mt-0.5">
                    {reportData.compliance_audit.statutory_verdict}
                  </div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="text-[10px] text-slate-500 uppercase">Sale Blocking</div>
                  <div className="font-bold text-emerald-400 text-sm mt-0.5">
                    {reportData.compliance_audit.sale_blocking_status}
                  </div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="text-[10px] text-slate-500 uppercase">Hashes Linked</div>
                  <div className="font-mono font-bold text-cyan-400 text-sm mt-0.5">
                    {reportData.compliance_audit.total_evidentiary_hashes_linked} Verified
                  </div>
                </div>
              </div>

              {/* Evidentiary Index Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 font-bold text-slate-200">
                  Evidentiary Checksum Index
                </div>
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase bg-slate-950/40">
                      <th className="p-2.5">ID</th>
                      <th className="p-2.5">Artifact</th>
                      <th className="p-2.5">SHA-256 Fingerprint</th>
                      <th className="p-2.5 text-right">Verdict</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono">
                    {reportData.evidentiary_index.map(ev => (
                      <tr key={ev.evidence_id} className="hover:bg-slate-800/30">
                        <td className="p-2.5 text-amber-400 font-bold">{ev.evidence_id}</td>
                        <td className="p-2.5 text-slate-300 font-sans">{ev.file_name}</td>
                        <td className="p-2.5 text-slate-400 text-[10px] truncate max-w-xs">{ev.sha256_checksum}</td>
                        <td className="p-2.5 text-right font-sans">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                            {ev.ocr_verdict}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Disclaimer */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[10px] text-slate-500 leading-relaxed">
                {reportData.report_metadata.disclaimer}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
