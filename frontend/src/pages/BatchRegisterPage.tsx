import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PlusCircle, CheckCircle2, Shield, QrCode, ArrowRight, AlertTriangle, ExternalLink } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Modal from '../components/ui/Modal';
import QrCodeView from '../components/ui/QrCodeView';
import batchService from '../services/batchService';
import medicineService, { Medicine } from '../services/medicineService';

export const BatchRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loadingMedicines, setLoadingMedicines] = useState(true);

  // Auto-generate unique batch ID default (e.g. B2026-4819)
  const generateUniqueBatchId = () => `B2026-${Math.floor(1000 + Math.random() * 9000)}`;

  const [batchNumber, setBatchNumber] = useState(generateUniqueBatchId);
  const [medicineId, setMedicineId] = useState('');
  const [mfgDate, setMfgDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    return d.toISOString().slice(0, 10);
  });
  const [quantity, setQuantity] = useState<number>(1000);
  const [unit, setUnit] = useState<'BOX' | 'TABLET_STRIP' | 'VIAL' | 'BOTTLE'>('BOX');
  const [storageReq, setStorageReq] = useState('15°C - 25°C Controlled Room Temp');
  const [notes, setNotes] = useState('Quality assurance testing verified in compliance with Pharmacopeia standards.');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredBatch, setRegisteredBatch] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    medicineService.getMedicines()
      .then((meds) => {
        if (!mounted) return;
        setMedicines(meds);
        if (meds.length > 0 && !medicineId) {
          setMedicineId(meds[0].id);
        }
      })
      .catch((err) => console.error('Failed to load medicines:', err))
      .finally(() => {
        if (mounted) setLoadingMedicines(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Client-side validations
    if (!batchNumber.trim()) {
      setValidationError('Batch number is required.');
      return;
    }
    if (!medicineId) {
      setValidationError('Please select a medicine from the catalogue.');
      return;
    }
    if (new Date(expiryDate) <= new Date(mfgDate)) {
      setValidationError('Expiry date must be strictly after manufacturing date.');
      return;
    }
    if (quantity <= 0) {
      setValidationError('Manufactured quantity must be greater than 0.');
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);
    try {
      const res = await batchService.registerBatch({
        batch_number: batchNumber.trim().toUpperCase(),
        medicine_id: medicineId,
        mfg_date: mfgDate,
        expiry_date: expiryDate,
        initial_quantity: Number(quantity),
        unit: unit as any,
      });
      setRegisteredBatch(res);
      if (res && res.batch_number) {
        localStorage.setItem('pharmasafe_latest_batch', res.batch_number);
      } else {
        localStorage.setItem('pharmasafe_latest_batch', batchNumber.trim().toUpperCase());
      }
    } catch (err: any) {
      const rawMsg = err.message || 'Registration failed. Please check backend connection.';
      const cleanMsg = rawMsg.replace(/^\[\d+\]\s*/, '');
      setValidationError(cleanMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manufacturer Batch Registration"
        description="Catalog newly manufactured pharmaceutical lots into the National PharmaSafe ledger with cryptographically signed GTINs"
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
            Authorized Manufacturer Portal
          </span>
        }
        actions={
          <Link
            to="/medicines"
            className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <span>Medicine Catalogue</span>
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
          </Link>
        }
      />

      <div className="max-w-3xl glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        {validationError && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/70 border border-rose-800 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-200">
                <strong className="font-semibold block mb-0.5">
                  {validationError.includes('Duplicate') || validationError.includes('already exists') 
                    ? 'Validation Error / Duplicate Batch ID' 
                    : 'Registration Error'}
                </strong>
                {validationError}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setBatchNumber(generateUniqueBatchId());
                setValidationError(null);
              }}
              className="px-3 py-1.5 bg-rose-900/80 hover:bg-rose-800 border border-rose-700 text-rose-100 rounded-lg text-xs font-mono font-bold shrink-0 transition-colors"
            >
              Generate New ID
            </button>
          </div>
        )}

        {registeredBatch && !validationError && (
          <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-emerald-950/90 to-slate-900 border border-emerald-500/40 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_30px_rgba(16,185,129,0.25)]">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-900/80 text-emerald-300 border border-emerald-700">
                    MINTED ON LEDGER
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-300">
                    {registeredBatch.batch_number}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mb-1">
                  Cryptographic Batch Inscription Successful!
                </h3>
                <p className="text-xs text-slate-300 mb-3">
                  This batch is now active on the national network. You can point your mobile camera at this QR code right now to verify tracking and authenticity!
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/batches/${registeredBatch.id || registeredBatch.batch_number}`}
                    className="px-3.5 py-1.5 bg-emerald-900/90 hover:bg-emerald-800 border border-emerald-700 text-emerald-100 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Digital Passport</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    to={`/pipeline?batchId=${registeredBatch.batch_number || registeredBatch.id}`}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.3)] hover:brightness-110"
                  >
                    <span>Run in AI Pipeline</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Live Scannable Optical QR Code */}
            <div className="shrink-0 flex flex-col items-center">
              <QrCodeView
                value={registeredBatch.qr_payload || `PHARMASAFE:${registeredBatch.batch_number}:${registeredBatch.gtin_barcode || '08901000'}`}
                size={140}
                label={registeredBatch.batch_number}
                sublabel="Scan with Mobile App"
              />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Pharmaceutical Product
                </label>
                <Link to="/medicines" className="text-[11px] text-cyan-400 hover:underline">
                  + New Medicine
                </Link>
              </div>
              {loadingMedicines ? (
                <div className="text-xs text-slate-500 p-2 border border-slate-800 rounded bg-slate-900">
                  Loading catalogue...
                </div>
              ) : (
                <select
                  value={medicineId}
                  onChange={(e) => setMedicineId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-medium"
                >
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.brand_name} ({m.generic_name} {m.strength})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Batch Identifier Number
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setBatchNumber(generateUniqueBatchId());
                    setValidationError(null);
                  }}
                  className="text-[11px] text-cyan-400 hover:underline font-mono cursor-pointer"
                >
                  ⚡ Auto-Generate Unique ID
                </button>
              </div>
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                required
                placeholder="e.g. B2026-8819"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Manufacturing Date
              </label>
              <input
                type="date"
                value={mfgDate}
                onChange={(e) => setMfgDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Expiry Date (Shelf Life Limit)
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Total Manufactured Lot Quantity
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Packaging Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-medium"
              >
                <option value="BOX">BOX</option>
                <option value="TABLET_STRIP">TABLET_STRIP</option>
                <option value="VIAL">VIAL</option>
                <option value="BOTTLE">BOTTLE</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Storage & Cold-Chain Protocol
            </label>
            <input
              type="text"
              value={storageReq}
              onChange={(e) => setStorageReq(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-sans"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Quality Assurance Certification Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-sans"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>Cryptographic GTIN Inscription</span>
            </span>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Inscribing Batch...' : 'Register Batch & Issue Passport'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BatchRegisterPage;
