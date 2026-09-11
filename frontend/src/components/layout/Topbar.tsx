import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Search, Bell, User as UserIcon, Menu, Shield, 
  ChevronDown, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { User, RoleType } from '../../types/api';
import { useAuth } from '../../context/AuthContext';

interface TopbarProps {
  currentUser: User;
  onRoleChange: (role: RoleType) => void;
  onMobileMenuToggle: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentUser,
  onRoleChange,
  onMobileMenuToggle,
}) => {
  const navigate = useNavigate();
  const { switchRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const query = searchQuery.trim().toUpperCase();
    navigate(`/batches/${query}`);
  };

  const roles: { key: string; label: string; role: RoleType; org: string }[] = [
    { key: 'manufacturer', label: 'Manufacturer (Pfizer India)', role: 'MANUFACTURER', org: 'Pfizer Healthcare India Ltd.' },
    { key: 'distributor', label: 'Distributor (Apollo Hub)', role: 'DISTRIBUTOR', org: 'Apollo National Logistics' },
    { key: 'pharmacy', label: 'Pharmacy (MedPlus #104)', role: 'PHARMACY', org: 'MedPlus Central Pharmacy' },
    { key: 'disposal', label: 'Disposal (GreenShield)', role: 'DISPOSAL_FACILITY', org: 'GreenShield Incinerator' },
    { key: 'regulator', label: 'Regulator (CDSCO Authority)', role: 'REGULATOR_AUDITOR', org: 'CDSCO Central Drug Authority' },
    { key: 'admin', label: 'System Admin (PharmaSafe Ops)', role: 'ADMIN', org: 'PharmaSafe Security Operations' },
  ];

  const handleSelectRole = async (roleKey: string, role: RoleType) => {
    await switchRole(roleKey);
    onRoleChange(role);
    setRoleDropdownOpen(false);
  };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
      {/* Mobile Toggle & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60"
        >
          <Menu className="w-5 h-5" />
        </button>

        <form onSubmit={handleSearch} className="relative w-full max-w-md hidden sm:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search Batch ID (e.g. B1001), GTIN, or Certificate..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 font-mono transition-all"
          />
        </form>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Environment Indicator */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>CLOSED-LOOP SAFETY ACTIVE</span>
        </div>

        {/* Persona Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline font-mono">Role:</span>
            <span className="text-cyan-400 uppercase tracking-wide truncate max-w-[120px]">
              {currentUser.role.replace('_', ' ')}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {roleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 glass-panel rounded-xl border border-slate-700/80 shadow-2xl z-50 py-2 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Switch Evaluator Role
              </div>
              {roles.map(r => (
                <button
                  key={r.key}
                  onClick={() => handleSelectRole(r.key, r.role)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-start gap-2 hover:bg-slate-800/70 transition-colors ${
                    currentUser.role === r.role ? 'bg-cyan-500/10 text-cyan-300 font-semibold' : 'text-slate-300'
                  }`}
                >
                  <CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${currentUser.role === r.role ? 'text-cyan-400' : 'opacity-0'}`} />
                  <div>
                    <div className="text-xs font-medium text-white">{r.label}</div>
                    <div className="text-[10px] text-slate-400">{r.org}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Icon */}
        <Link
          to="/alerts"
          className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
          title="Incident Alerts"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-950" />
        </Link>

        {/* User Profile Mini */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-7 h-7 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-xs">
            {currentUser.full_name[0]}
          </div>
          <div className="hidden lg:block text-left">
            <span className="text-xs font-semibold text-white block leading-tight truncate max-w-[130px]">
              {currentUser.full_name}
            </span>
            <span className="text-[10px] text-slate-500 font-mono block">
              {currentUser.role}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
