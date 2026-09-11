import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, FileText, CheckCircle2, Hash, Flame,
  Lock, XCircle, AlertTriangle, Plus, ChevronDown,
  ChevronUp, Skull, Clock, Loader2
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import certificateService from '../services/certificateService';
import apiClient from '../services/apiClient';
import { DestructionRecord, Batch, DisposalRecord } from '../types/api';
import { demoState } from '../mocks/mockData';
import { useAuth } from '../context/AuthContext';

const DESTRUCTION_METHODS = [
  { value: 'HIGH_TEMP_INCINERATION_1200C', label: '1200°C High-Temperature Incineration' },
  { value: 'CHEMICAL_DENATURATION', label: 'Chemical Denaturation + Acid Neutralization' },
  { value: 'AUTOCLAVE_SHREDDING', label: 'Autoclave Sterilization + Mechanical Shredding' },
  { value: 'CONTROLLED_LANDFILL_ENCAPSULATION', label: 'Controlled Landfill Encapsulation (TSDF)' },
];

type VerificationOutcome = {
  success: boolean;
  isValid?: boolean;
  certificate_id?: string;
  batch_id?: string;
  batch_number?: string;
  destroyed_quantity?: number;
  verification_status: string;
  certificate_hash?: string;
  hash_valid?: boolean;
  batch_status?: string;
  dead_batch_registry_id?: string;
  message: string;
  error_code?: string;
  certificate?: { batch_id: string; quantity_destroyed: number; timestamp: string; id: string };
};

export const DestructionCertificatesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [certificates, setCertificates] = useState<DestructionRecord[]>([]);
  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);
  const [disposalRecords, setDisposalRecords] = useState<DisposalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyHashInput, setVerifyHashInput] = useState('B1001');
  const [verificationOutcome, setVerificationOutcome] = useState<VerificationOutcome | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Issue Certificate modal
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issuingCert, setIssuingCert] = useState(false);
  const [issueSuccess, setIssueSuccess] = useState<VerificationOutcome | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);

  // Issue form state
  const [issueBatchId, setIssueBatchId] = useState('');
  const [issueDisposalId, setIssueDisposalId] = useState('');
  const [issueQuantity, setIssueQuantity] = useState(1000);
  const [issueMethod, setIssueMethod] = useState('HIGH_TEMP_INCINERATION_1200C');
  const [issueWitnessName, setIssueWitnessName] = useState('Inspector Rajiv Verma (State FDA)');
  const [issueWitnessBadge, setIssueWitnessBadge] = useState('INSP-MH-9942');
  const [issueWeight, setIssueWeight] = useState('45.5');
  const [issueNotes, setIssueNotes] = useState('Certified biohazard disposal and incineration completed per sovereign protocol.');

  // Expanded cert card
  const [expandedCertId, setExpandedCertId] = useState<string | null>(null);

  const isDisposalFacility = currentUser?.role === 'DISPOSAL_FACILITY' || currentUser?.role === 'ADMIN';

  const loadData = async () => {
    setLoading(true);
    try {
      const [certs, batches, disposals] = await Promise.all([
        certificateService.getCertificates(),
        apiClient.getBatches().catch(() => []),
        apiClient.getDisposalRecords().catch(() => []),
      ]);

      setAvailableBatches(batches);
      setDisposalRecords(disposals);

      // Dynamic inclusion if B1001 was destroyed
      if (demoState.isB1001Destroyed) {
        const hasB1001 = certs.find(c => c.batch_id === 'B1001');
        if (!hasB1001) {
          certs.unshift({
            id: 'cert_dst_b1001',
            batch_id: 'B1001',
            facility_org_id: 'org_green_shield_disposal',
            quantity_destroyed: 1000,
            destruction_method: 'HIGH_TEMP_INCINERATION_1200C',
            witness_name: 'Inspector Rajiv Verma (State FDA)',
            witness_badge_id: 'INSP-MH-9942',
            certificate_sha256_hash: demoState.destructionCertHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            certificate_url: '/certificates/b1001_cert.pdf',
            evidence_media_url: '/storage/evidence/incineration_b1001.jpg',
            facility_notes: 'Denatured and incinerated per biohazard protocol § 14-B.',
            timestamp: new Date().toISOString(),
          });
        }
      }
      setCertificates(certs);
    } catch (_) {
    } finally {
      setLoading(false);
    }

    if (demoState.isB1001Destroyed) {
      certificateService.verifyCertificateHash('B1001').then(res => setVerificationOutcome(res as any));
    }
  };

  useEffect(() => {
    loadData();
  }, [demoState.isB1001Destroyed]);

  const handleBatchSelect = (batchIdOrNumber: string) => {
    setIssueBatchId(batchIdOrNumber);
    const matchedBatch = availableBatches.find(b => b.id === batchIdOrNumber || b.batch_number === batchIdOrNumber);
    const matchedDisposal = disposalRecords.find(d => d.batch_id === batchIdOrNumber || d.batch_id === matchedBatch?.id);

    if (matchedBatch) {
      setIssueQuantity(matchedBatch.current_quantity || matchedBatch.initial_quantity || 1000);
    }
    if (matchedDisposal) {
      setIssueDisposalId(matchedDisposal.id);
      const dispQty = (matchedDisposal as any).quantity_destroyed || (matchedDisposal as any).quantity || (matchedDisposal as any).received_quantity;
      if (dispQty) {
        setIssueQuantity(dispQty);
      }
    }
  };

  const handleVerify = async () => {
    if (!verifyHashInput.trim()) return;
    setVerifying(true);
    setVerificationOutcome(null);

    try {
      const records = await apiClient.getDestructionRecords().catch(() => []);
      const q = verifyHashInput.trim().toLowerCase();
      const backendRecord = records?.find((r: any) =>
        r.certificate_sha256_hash?.toLowerCase().includes(q) ||
        r.batch_id?.toLowerCase() === q ||
        r.id?.toLowerCase() === q
      );
      if (backendRecord?.id) {
        const verifyRes = await apiClient.verifyDestructionCertificate(backendRecord.id);
        setVerificationOutcome(verifyRes as VerificationOutcome);
        setVerifying(false);
        return;
      }
    } catch (_) {}

    const res = await certificateService.verifyCertificateHash(verifyHashInput.trim());
    setVerificationOutcome(res as any);
    setVerifying(false);
  };

  const handleIssueCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIssuingCert(true);
    setIssueError(null);
    setIssueSuccess(null);

    const trimmedBatchId = issueBatchId.trim();
    if (!trimmedBatchId) {
      setIssueError('Please specify a valid batch number or select an existing batch from the dropdown.');
      setIssuingCert(false);
      return;
    }

    // Validate if the batch exists in known inventory / system batches
    const matchedBatch = availableBatches.find(
      b => b.id.toLowerCase() === trimmedBatchId.toLowerCase() ||
           b.batch_number.toLowerCase() === trimmedBatchId.toLowerCase()
    );

    // If batch ID is completely random (e.g. 12234) and not in available batches, reject with helpful message
    if (availableBatches.length > 0 && !matchedBatch && trimmedBatchId !== 'B1001' && trimmedBatchId !== 'B1002' && trimmedBatchId !== 'B-SWFT-001') {
      setIssueError(
        `Batch "${trimmedBatchId}" does not exist in the active medicine registry. Please select an authorized batch awaiting disposal.`
      );
      setIssuingCert(false);
      return;
    }

    try {
      let recordId: string | null = null;
      try {
        const record = await apiClient.createDestructionRecord({
          batch_id: matchedBatch?.id || trimmedBatchId,
          disposal_id: issueDisposalId.trim() || undefined,
          quantity_destroyed: Number(issueQuantity),
          destruction_method: issueMethod,
          witness_name: issueWitnessName.trim(),
          witness_badge_id: issueWitnessBadge.trim(),
          scale_weight_kg: issueWeight.trim() || undefined,
          facility_notes: issueNotes.trim() || undefined,
        });
        recordId = record.id;
      } catch (backendErr: any) {
        const detail = backendErr?.response?.data?.detail || backendErr?.detail || backendErr?.message || '';
        const errorMsg = typeof detail === 'string' ? detail : JSON.stringify(detail);
        
        if (errorMsg.includes('NOT_DISPOSED') || errorMsg.includes('DISPOSED')) {
          throw new Error('Batch must be logged as checked into the disposal facility before issuing a certified destruction attestation.');
        }
        if (errorMsg.includes('ALREADY_CERTIFIED') || errorMsg.includes('already exists')) {
          throw new Error('An official destruction certificate has already been issued for this batch.');
        }
        if (errorMsg.includes('not found') || errorMsg.includes('404')) {
          throw new Error(`Batch "${trimmedBatchId}" was not found on the central pharmaceutical safety server.`);
        }
        throw new Error(errorMsg || 'Failed to issue destruction certificate.');
      }

      if (recordId) {
        const verifyResult = await apiClient.verifyDestructionCertificate(recordId);
        setIssueSuccess(verifyResult as VerificationOutcome);
        loadData();
      }
    } catch (err: any) {
      setIssueError(err?.message || 'Failed to issue destruction certificate. Ensure batch is registered.');
    } finally {
      setIssuingCert(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certified Medicine Destruction Records"
        description="Immutable SHA-256 cryptographic destruction attestations — the final closed-loop lifecycle event guaranteeing permanent removal and Dead Batch Registry inscription."
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
            SHA-256 Certified Records
          </span>
        }
        actions={
          isDisposalFacility ? (
            <button
              onClick={() => {
                setShowIssueModal(true);
                setIssueSuccess(null);
                setIssueError(null);
                if (availableBatches.length > 0 && !issueBatchId) {
                  handleBatchSelect(availableBatches[0].batch_number);
                }
              }}
              className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-600 text-white text-xs font-bold hover:brightness-110 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              <Plus className="w-4 h-4" />
              <span>Issue Destruction Certificate</span>
            </button>
          ) : undefined
        }
      />

      {/* Lifecycle Banner */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-4">
        <div className="flex items-center gap-2 shrink-0 text-emerald-400">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <Flame className="w-5 h-5" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white">Closed-Loop Medicine De-Registration Protocol</h3>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs font-mono">
            {[
              { label: 'Facility Inbound Received', color: 'text-purple-400 border-purple-500/40 bg-purple-950/30' },
              { label: '→', color: 'text-slate-500' },
              { label: 'Physical Processing Verified', color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/30' },
              { label: '→', color: 'text-slate-500' },
              { label: 'SHA-256 Hash Generated', color: 'text-amber-400 border-amber-500/40 bg-amber-950/30' },
              { label: '→', color: 'text-slate-500' },
              { label: 'Cryptographically Verified', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30' },
              { label: '→', color: 'text-slate-500' },
              { label: 'Permanently DESTROYED', color: 'text-red-400 border-red-500/40 bg-red-950/30' },
              { label: '→', color: 'text-slate-500' },
              { label: 'Dead Batch Enrolled', color: 'text-rose-400 border-rose-500/40 bg-rose-950/30' },
            ].map((item, i) => (
              item.label === '→' ? (
                <span key={i} className={item.color}>{item.label}</span>
              ) : (
                <span key={i} className={`px-2 py-0.5 rounded border ${item.color}`}>{item.label}</span>
              )
            ))}
          </div>
        </div>
      </div>

      {/* Certificate Hash Verification Console */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Hash className="w-4 h-4 text-cyan-400" />
              <span>Certificate Hash Verification Console</span>
            </h3>
            <p className="text-xs text-slate-400">Recompute SHA-256 from stored fields and validate cryptographic integrity</p>
          </div>
          <span className="text-[11px] font-mono text-cyan-400 font-semibold">Integrity Validator</span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={verifyHashInput}
            onChange={e => setVerifyHashInput(e.target.value)}
            placeholder="Enter SHA-256 hash, Batch ID (e.g. B1001), or Certificate ID..."
            className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="px-5 py-2 bg-cyan-500 text-slate-950 text-xs font-bold rounded-lg hover:bg-cyan-400 transition-colors shadow-lg shrink-0 flex items-center gap-2 disabled:opacity-60"
          >
            {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            Verify
          </button>
        </div>

        {/* Verification Result */}
        {verificationOutcome && (
          <div className={`p-5 rounded-xl border mt-4 ${
            verificationOutcome.isValid || verificationOutcome.success
              ? 'bg-emerald-950/30 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
              : 'bg-rose-950/30 border-rose-500/50'
          }`}>
            <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                {(verificationOutcome as any).isValid || verificationOutcome.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400" />
                )}
                <span className={`text-xs font-bold uppercase font-mono tracking-wider ${
                  (verificationOutcome as any).isValid || verificationOutcome.success ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {(verificationOutcome as any).isValid || verificationOutcome.success
                    ? 'DESTRUCTION VERIFIED • CERTIFICATE VALID'
                    : verificationOutcome.verification_status || 'CERTIFICATE NOT LOCATED'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">SHA-256 Checksum Match</span>
            </div>

            {((verificationOutcome as any).isValid || verificationOutcome.success) ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                {[
                  { label: 'Batch Identifier', value: `${verificationOutcome.batch_number || (verificationOutcome as any).certificate?.batch_id} (MATCH)` },
                  { label: 'Destroyed Count', value: `${(verificationOutcome.destroyed_quantity || (verificationOutcome as any).certificate?.quantity_destroyed || '—').toLocaleString?.()} (MATCH)` },
                  { label: 'Batch Status', value: verificationOutcome.batch_status || 'DESTROYED' },
                  { label: 'Certificate ID', value: verificationOutcome.certificate_id || (verificationOutcome as any).certificate?.id || 'VERIFIED' },
                ].map(({ label, value }) => (
                  <div key={label} className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-500 font-mono text-[10px] block uppercase">{label}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <strong className="text-white font-mono truncate">{value}</strong>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-rose-300">
                {verificationOutcome.message || 'No verified destruction certificate found for this query.'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Certificates Archive */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" />
            Official Certificates Archive
          </h3>
          <span className="text-xs text-slate-400 font-mono">{certificates.length} certificate{certificates.length !== 1 ? 's' : ''} on record</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          </div>
        ) : certificates.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">
            <Skull className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No destruction certificates on record yet.
          </div>
        ) : (
          <div className="space-y-4">
            {certificates.map(cert => {
              const isExpanded = expandedCertId === cert.id;
              const isPending = (cert as any).verification_status === 'PENDING';
              return (
                <div
                  key={cert.id}
                  className={`p-5 rounded-xl border transition-all space-y-3 ${
                    isPending
                      ? 'bg-amber-950/20 border-amber-500/40'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-lg border ${
                        isPending
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      }`}>
                        {isPending ? <Clock className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-cyan-400 text-sm">
                            Batch: {cert.batch_id}
                          </span>
                          <StatusBadge status={isPending ? 'DISPOSED' : 'DESTROYED'} size="sm" />
                          {isPending && (
                            <span className="px-2 py-0.5 rounded border border-amber-500/40 bg-amber-950/30 text-amber-400 text-[10px] font-mono">
                              PENDING VERIFICATION
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {(cert as any).certificate_id || cert.id}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-white block">
                          {cert.quantity_destroyed.toLocaleString()} Units Destroyed
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {cert.timestamp.split('T')[0]}
                        </span>
                      </div>
                      <button
                        onClick={() => setExpandedCertId(isExpanded ? null : cert.id)}
                        className="text-slate-400 hover:text-white"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Summary Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
                    <div>
                      <span className="text-slate-500 uppercase font-mono text-[10px] block">Method</span>
                      <strong className="text-slate-200">{cert.destruction_method}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase font-mono text-[10px] block">Witness Signer</span>
                      <strong className="text-slate-200">{cert.witness_name} ({cert.witness_badge_id})</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase font-mono text-[10px] block">Verification Status</span>
                      <strong className={isPending ? 'text-amber-400' : 'text-emerald-400'}>
                        {(cert as any).verification_status || 'VERIFIED'}
                      </strong>
                    </div>
                  </div>

                  {/* SHA-256 Hash Row */}
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs flex items-center justify-between gap-2">
                    <span className="text-slate-500 text-[10px] uppercase shrink-0">SHA-256 Hash:</span>
                    <span className="text-cyan-400 truncate text-[11px] font-semibold">
                      {cert.certificate_sha256_hash}
                    </span>
                    <button
                      onClick={() => { setVerifyHashInput(cert.batch_id); handleVerify(); }}
                      className="shrink-0 text-slate-400 hover:text-cyan-300 text-[11px] underline"
                    >
                      Verify
                    </button>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-2 pt-3 border-t border-slate-800/60 space-y-2 text-xs">
                      {cert.facility_notes && (
                        <div>
                          <span className="text-slate-500 uppercase font-mono text-[10px] block mb-1">Facility Notes</span>
                          <p className="text-slate-300 italic">{cert.facility_notes}</p>
                        </div>
                      )}
                      {(cert as any).scale_weight_kg && (
                        <div>
                          <span className="text-slate-500 uppercase font-mono text-[10px]">Scale Weight: </span>
                          <span className="text-slate-300 font-mono">{(cert as any).scale_weight_kg} kg</span>
                        </div>
                      )}

                      {isPending && (
                        <button
                          onClick={async () => {
                            try {
                              const result = await apiClient.verifyDestructionCertificate(cert.id);
                              setVerificationOutcome(result as VerificationOutcome);
                              loadData();
                            } catch (err: any) {
                              alert(`Verification failed: ${err.message}`);
                            }
                          }}
                          className="mt-2 w-full py-2 rounded-lg bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold hover:bg-emerald-500/30 transition-colors flex items-center justify-center gap-2"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          Run SHA-256 Verification → Finalize DESTROYED
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Issue Certificate Modal */}
      <Modal
        isOpen={showIssueModal}
        onClose={() => { setShowIssueModal(false); setIssueSuccess(null); setIssueError(null); }}
        title="Issue Official Destruction Certificate"
      >
        {issueSuccess ? (
          <div className="space-y-4">
            <div className="p-5 rounded-xl bg-emerald-950/40 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <div>
                  <h4 className="font-bold text-emerald-300 text-sm">DESTRUCTION CERTIFICATE ISSUED & VERIFIED</h4>
                  <span className="text-[11px] text-emerald-400/80 font-mono">Certificate ID: {issueSuccess.certificate_id || 'CERT-OK'}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs mt-3">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 font-mono text-[10px] uppercase block">Batch</span>
                  <span className="font-mono text-white font-bold">{issueSuccess.batch_number || issueSuccess.batch_id}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 font-mono text-[10px] uppercase block">Final Status</span>
                  <span className="font-mono text-red-400 font-bold">{issueSuccess.batch_status || 'DESTROYED'}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 font-mono text-[10px] uppercase block">Qty Destroyed</span>
                  <span className="font-mono text-white font-bold">{issueSuccess.destroyed_quantity?.toLocaleString() || issueQuantity.toLocaleString()}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 font-mono text-[10px] uppercase block">Hash Valid</span>
                  <span className={`font-mono font-bold ${issueSuccess.hash_valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {issueSuccess.hash_valid ? '✓ VERIFIED' : '✗ MISMATCH'}
                  </span>
                </div>
              </div>
              {issueSuccess.certificate_hash && (
                <div className="mt-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs">
                  <span className="text-slate-500 text-[10px] uppercase">SHA-256: </span>
                  <span className="text-cyan-400 text-[11px] break-all">{issueSuccess.certificate_hash}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 text-center">
              {issueSuccess.message || 'Batch permanently inscribed into Dead Batch Registry. Re-entry attempts will be flagged.'}
            </p>
            <button
              onClick={() => { setShowIssueModal(false); setIssueSuccess(null); loadData(); }}
              className="w-full py-2 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition-colors"
            >
              Done — View Certificates
            </button>
          </div>
        ) : (
          <form onSubmit={handleIssueCertificate} className="space-y-4">
            <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/40 text-xs text-cyan-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-cyan-400" />
              <span>
                <strong>Facility Certification Rule:</strong> Select an eligible batch registered in the pharmaceutical ledger. Issuing this certificate cryptographically commits the SHA-256 hash and enrolls the batch into the <strong>Dead Batch Registry</strong>.
              </span>
            </div>

            {issueError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/50 text-xs text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{issueError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Select Registered Batch *
                </label>
                {availableBatches.length > 0 ? (
                  <select
                    value={issueBatchId}
                    onChange={e => handleBatchSelect(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-cyan-500 mb-2"
                  >
                    <option value="">-- Choose from Registered Batches --</option>
                    {availableBatches.map(b => (
                      <option key={b.id} value={b.batch_number}>
                        {b.batch_number} — {b.medicine_id || 'Medicine'} ({b.current_quantity?.toLocaleString() || b.initial_quantity?.toLocaleString()} units) [{b.status}]
                      </option>
                    ))}
                  </select>
                ) : null}

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-mono">Or enter Batch ID / Number:</span>
                  <input
                    required
                    value={issueBatchId}
                    onChange={e => setIssueBatchId(e.target.value)}
                    placeholder="e.g. B1001"
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Disposal Inbound Record ID (Optional)
                </label>
                <input
                  value={issueDisposalId}
                  onChange={e => setIssueDisposalId(e.target.value)}
                  placeholder="Facility inbound disposal reference (auto-resolved if blank)"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">Quantity Destroyed *</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={issueQuantity}
                  onChange={e => setIssueQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">Scale Weight (kg)</label>
                <input
                  value={issueWeight}
                  onChange={e => setIssueWeight(e.target.value)}
                  placeholder="e.g. 45.5"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">Destruction Method *</label>
                <select
                  required
                  value={issueMethod}
                  onChange={e => setIssueMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {DESTRUCTION_METHODS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">Witness Official Name *</label>
                <input
                  required
                  value={issueWitnessName}
                  onChange={e => setIssueWitnessName(e.target.value)}
                  placeholder="e.g. Inspector Rajiv Verma (State FDA)"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">Witness Badge / License ID *</label>
                <input
                  required
                  value={issueWitnessBadge}
                  onChange={e => setIssueWitnessBadge(e.target.value)}
                  placeholder="e.g. INSP-MH-9942"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">Facility Notes & Compliance Remarks</label>
                <textarea
                  rows={2}
                  value={issueNotes}
                  onChange={e => setIssueNotes(e.target.value)}
                  placeholder="Biohazard handling protocol, verification remarks..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => { setShowIssueModal(false); setIssueError(null); }}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={issuingCert}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-600 text-white text-xs font-bold hover:brightness-110 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-60"
              >
                {issuingCert ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flame className="w-3.5 h-3.5" />}
                <span>Issue & Register Dead Batch</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default DestructionCertificatesPage;
