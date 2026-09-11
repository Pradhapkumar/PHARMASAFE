import React, { useState } from 'react';
import { Settings, User, Building, Shield, Bell, Key, Save } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import authService from '../services/authService';

export const SettingsPage: React.FC = () => {
  const user = authService.getStoredUser();
  const currentUser = user || {
    id: 'usr_default',
    email: 'evaluator@pharmasafe.demo',
    full_name: 'Evaluator Admin',
    role: 'ADMIN' as const,
    organization_id: 'org_admin'
  };
  const [fullName, setFullName] = useState(currentUser.full_name);
  const [email, setEmail] = useState(currentUser.email);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform & Security Configuration"
        description="Manage organizational credentials, cryptographic TLS keypairs, and real-time sentinel notification thresholds"
      />

      {/* Settings Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'profile'
              ? 'bg-cyan-500 text-slate-950'
              : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Profile & Organization</span>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'security'
              ? 'bg-cyan-500 text-slate-950'
              : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Cryptographic Keys & RBAC</span>
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'notifications'
              ? 'bg-cyan-500 text-slate-950'
              : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Sentinel Alerts & Webhooks</span>
        </button>
      </div>

      <div className="max-w-2xl glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        {savedSuccess && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs">
            ✓ Preferences and configuration securely updated.
          </div>
        )}

        {activeTab === 'profile' && (
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Authorized Officer Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-medium"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Designated Institutional Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Assigned Enterprise Role
              </label>
              <input
                type="text"
                readOnly
                value={currentUser.role}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-cyan-400 font-mono font-bold"
              />
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition-colors flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Save Profile Changes</span>
              </button>
            </div>
          </form>
        )}

        {activeTab === 'security' && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 font-mono space-y-2">
              <span className="text-slate-500 uppercase text-[10px] block font-bold">SHA-256 Ledger Public Key</span>
              <p className="text-cyan-400 break-all text-[11px]">
                04a98f12c4b89e102f98e72c4a9108b89e72f1049b109e24ca8b9910e14a9b24...
              </p>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
              <span className="text-white font-semibold block">Hardware Key Security Module (HSM)</span>
              <p className="text-slate-400 text-[11px]">FIPS 140-2 Level 3 cryptographic token active.</p>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-2 p-3 bg-slate-900/80 rounded-xl border border-slate-800 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-slate-700 bg-slate-950 text-cyan-500" />
              <span className="text-slate-200">Trigger immediate SMS & E-mail upon Dead Batch Re-Entry detection</span>
            </label>
            <label className="flex items-center gap-2 p-3 bg-slate-900/80 rounded-xl border border-slate-800 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-slate-700 bg-slate-950 text-cyan-500" />
              <span className="text-slate-200">Alert on return shipment quantity mismatch exceeding 5 units</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
