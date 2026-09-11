import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Pill, Plus, Search, Filter, ShieldCheck, Thermometer, 
  ExternalLink, Layers, CheckCircle2, AlertTriangle, Building2
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Modal from '../components/ui/Modal';
import LoadingState from '../components/ui/LoadingState';
import medicineService, { Medicine, MedicineCreatePayload } from '../services/medicineService';

export const MedicineCataloguePage: React.FC = () => {
  const navigate = useNavigate();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedForm, setSelectedForm] = useState<string>('ALL');

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New Medicine Form State
  const [brandName, setBrandName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [dosageForm, setDosageForm] = useState('TABLET');
  const [strength, setStrength] = useState('');
  const [storageTemp, setStorageTemp] = useState('15°C - 25°C Controlled Room Temp');

  const loadMedicines = async () => {
    try {
      setLoading(true);
      const data = await medicineService.getMedicines(searchTerm || undefined);
      setMedicines(data);
    } catch (err) {
      console.error('Failed to load medicines:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedicines();
  }, [searchTerm]);

  const handleCreateMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!brandName.trim() || !genericName.trim() || !strength.trim()) {
      setFormError('Brand name, generic name, and strength are mandatory.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: MedicineCreatePayload = {
        brand_name: brandName.trim(),
        generic_name: genericName.trim(),
        dosage_form: dosageForm,
        strength: strength.trim(),
        storage_temp_celsius: storageTemp.trim() || undefined,
      };

      await medicineService.createMedicine(payload);
      setShowCreateModal(false);
      // Reset form
      setBrandName('');
      setGenericName('');
      setStrength('');
      setStorageTemp('15°C - 25°C Controlled Room Temp');
      await loadMedicines();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create medicine formulation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMedicines = medicines.filter((m) => {
    const matchesForm = selectedForm === 'ALL' || m.dosage_form.toUpperCase() === selectedForm.toUpperCase();
    return matchesForm;
  });

  const uniqueForms = Array.from(new Set(medicines.map((m) => m.dosage_form.toUpperCase())));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pharmaceutical Medicine Catalogue"
        description="Master formulations directory authorized for manufacture, serialization, and compliance tracking"
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
            Formulation Master
          </span>
        }
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:brightness-110 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register Formulation</span>
          </button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search brand, API generic, strength..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-400 font-mono shrink-0">Form:</span>
          <button
            onClick={() => setSelectedForm('ALL')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              selectedForm === 'ALL'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All ({medicines.length})
          </button>
          {uniqueForms.map((form) => (
            <button
              key={form}
              onClick={() => setSelectedForm(form)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                selectedForm === form
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {form}
            </button>
          ))}
        </div>
      </div>

      {/* Medicines Table / Cards */}
      {loading ? (
        <LoadingState message="Loading Formulations..." />
      ) : filteredMedicines.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center text-slate-500">
          <Pill className="w-10 h-10 mx-auto mb-2 text-slate-600" />
          <p className="text-sm font-medium">No pharmaceutical formulations match your query.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-3 px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-cyan-400 hover:bg-slate-800"
          >
            + Register First Formulation
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMedicines.map((med) => (
            <div
              key={med.id}
              className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400 uppercase font-semibold">
                    {med.dosage_form}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    ID: {med.id.slice(0, 10)}...
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mt-3 group-hover:text-cyan-300 transition-colors">
                  {med.brand_name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                  {med.generic_name}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Active Strength:</span>
                    <span className="text-slate-200 font-mono font-semibold">{med.strength}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Storage Specification:</span>
                    <span className="text-slate-300 font-mono text-[11px] truncate max-w-[160px]">
                      {med.storage_temp_celsius || '15°C - 25°C (Controlled Room Temp)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                <button
                  onClick={() => setSelectedMedicine(med)}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-medium"
                >
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Dossier Specs</span>
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-semibold flex items-center gap-1 transition-all"
                >
                  <span>Inscribe Batch</span>
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register New Medicine Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Register Master Medicine Formulation"
        subtitle="Catalog pharmaceutical composition into national regulatory registry"
      >
        <form onSubmit={handleCreateMedicine} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Brand / Commercial Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Paracetamol 500mg IP"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Active Generic Molecule (API)
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Paracetamol / Acetaminophen"
              value={genericName}
              onChange={(e) => setGenericName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Dosage Form
              </label>
              <select
                value={dosageForm}
                onChange={(e) => setDosageForm(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="TABLET">TABLET</option>
                <option value="CAPSULE">CAPSULE</option>
                <option value="INJECTION">INJECTION</option>
                <option value="SYRUP">SYRUP</option>
                <option value="OINTMENT">OINTMENT</option>
                <option value="VIAL">VIAL</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Strength / Potency
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 500 mg"
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Recommended Storage Conditions
            </label>
            <input
              type="text"
              placeholder="e.g. 15°C - 25°C Controlled Room Temp"
              value={storageTemp}
              onChange={(e) => setStorageTemp(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="flex-1 py-2 px-3 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Registering...' : 'Register Master'}</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </Modal>

      {/* Medicine Details Modal */}
      {selectedMedicine && (
        <Modal
          isOpen={Boolean(selectedMedicine)}
          onClose={() => setSelectedMedicine(null)}
          title={selectedMedicine.brand_name}
          subtitle={`Formulation ID: ${selectedMedicine.id}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Generic Ingredient:</span>
                <span className="text-cyan-300 font-semibold">{selectedMedicine.generic_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Strength:</span>
                <span className="text-white font-mono">{selectedMedicine.strength}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Dosage Delivery Form:</span>
                <span className="text-white font-semibold">{selectedMedicine.dosage_form}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Storage Constraints:</span>
                <span className="text-slate-300 font-mono">{selectedMedicine.storage_temp_celsius || 'Standard Ambient'}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedMedicine(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedMedicine(null);
                  navigate('/register');
                }}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 flex items-center gap-1"
              >
                <span>Register Batch For This Medicine</span>
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MedicineCataloguePage;
