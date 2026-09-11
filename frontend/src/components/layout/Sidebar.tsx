import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  ShieldCheck, LayoutDashboard, PlusCircle, FileText, Truck, 
  RotateCcw, Flame, AlertOctagon, Skull, ShoppingCart, 
  Search, ShieldAlert, Cpu, CalendarClock, History, 
  CheckSquare, Settings, ChevronLeft, ChevronRight,
  Boxes, Globe, Shield, Pill, Warehouse, Building2,
  BarChart3, FolderSearch, Landmark, GitBranch, Lock, Clock, Activity
} from 'lucide-react';
import { RoleType } from '../../types/api';
import authService from '../../services/authService';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  highlight?: boolean;
  allowedRoles?: RoleType[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  currentRole: RoleType;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentRole, className = '' }) => {
  const [collapsed, setCollapsed] = useState(false);

  // Define role-specific navigation groups
  const getNavGroups = (): NavGroup[] => {
    // 1. Core Platform Navigation
    const coreGroup: NavGroup = {
      title: 'Command & Oversight',
      items: [
        { to: '/dashboard', label: 'Command Center', icon: <LayoutDashboard className="w-4 h-4" /> },
        { to: '/analytics', label: 'Executive Analytics', icon: <BarChart3 className="w-4 h-4 text-emerald-400" />, highlight: true, allowedRoles: ['REGULATOR_AUDITOR', 'ADMIN'] },
        { to: '/compliance', label: 'Compliance Index', icon: <CheckSquare className="w-4 h-4" />, allowedRoles: ['REGULATOR_AUDITOR', 'ADMIN'] },
      ],
    };

    // 2. Forward Supply Chain & Manufacturer Portal
    const forwardGroup: NavGroup = {
      title: 'Forward Supply Chain',
      items: [
        { to: '/batches/B1001', label: 'Digital Batch Passport', icon: <FileText className="w-4 h-4" />, highlight: true },
        { to: '/batches/register', label: 'Batch Registration', icon: <PlusCircle className="w-4 h-4" />, allowedRoles: ['MANUFACTURER', 'ADMIN'] },
        { to: '/medicines', label: 'Medicine Catalogue', icon: <Pill className="w-4 h-4" /> },
        { to: '/manufacturer/inventory', label: 'Depot & Inventory', icon: <Boxes className="w-4 h-4" />, allowedRoles: ['MANUFACTURER', 'ADMIN'] },
        { to: '/distributor', label: 'Distributor Hub', icon: <Truck className="w-4 h-4" />, allowedRoles: ['DISTRIBUTOR', 'ADMIN'] },
        { to: '/pharmacy', label: 'Pharmacy Operations', icon: <Building2 className="w-4 h-4" />, allowedRoles: ['PHARMACY', 'ADMIN'] },
        { to: '/verify', label: 'Point-of-Care Scanner', icon: <Search className="w-4 h-4" />, allowedRoles: ['PHARMACY', 'ADMIN', 'REGULATOR_AUDITOR'] },
        { to: '/sales', label: 'Point-of-Sale Check', icon: <ShoppingCart className="w-4 h-4" />, allowedRoles: ['PHARMACY', 'ADMIN'] },
      ],
    };

    // 3. Closed-Loop Reverse Chain
    const reverseGroup: NavGroup = {
      title: 'Reverse Chain & Disposal',
      items: [
        { to: '/returns', label: 'Return Management', icon: <RotateCcw className="w-4 h-4" />, badge: 'Active' },
        { to: '/chain-of-custody', label: 'Chain of Custody', icon: <Boxes className="w-4 h-4" /> },
        { to: '/disposal', label: 'Disposal Facility', icon: <Flame className="w-4 h-4" />, allowedRoles: ['DISPOSAL_FACILITY', 'ADMIN'] },
        { to: '/certificates', label: 'Destruction Certificates', icon: <ShieldCheck className="w-4 h-4" />, allowedRoles: ['DISPOSAL_FACILITY', 'REGULATOR_AUDITOR', 'ADMIN'] },
      ],
    };

    // 4. Intelligence & Anti-Re-Entry
    const securityGroup: NavGroup = {
      title: 'Surveillance & AI Risk',
      items: [
        { to: '/investigations', label: 'Investigation Cases', icon: <FolderSearch className="w-4 h-4 text-amber-400" />, badge: 'Forensic', highlight: true, allowedRoles: ['REGULATOR_AUDITOR', 'ADMIN'] },
        { to: '/dead-batches', label: 'Dead Batch Registry', icon: <Skull className="w-4 h-4 text-rose-400" />, badge: 'Critical', allowedRoles: ['REGULATOR_AUDITOR', 'ADMIN'] },
        { to: '/pipeline', label: 'In-Market Expiry Sentinel', icon: <Clock className="w-4 h-4 text-amber-400" />, badge: 'Auto-Lock', highlight: true, allowedRoles: ['REGULATOR_AUDITOR', 'ADMIN'] },
        { to: '/ai-risk', label: 'AI Risk Intelligence', icon: <Cpu className="w-4 h-4 text-cyan-400" />, allowedRoles: ['REGULATOR_AUDITOR', 'ADMIN'] },
        { to: '/expiry-intelligence', label: 'Expiry Analytics', icon: <CalendarClock className="w-4 h-4" />, allowedRoles: ['MANUFACTURER', 'REGULATOR_AUDITOR', 'ADMIN'] },
      ],
    };

    // 5. Audit & System
    const auditGroup: NavGroup = {
      title: 'Governance',
      items: [
        { to: '/live-board', label: '⚡ Live Supply Chain Board', icon: <Activity className="w-4 h-4 text-emerald-400" />, badge: 'Real-Time', highlight: true },
        { to: '/gov-auth', label: '🏛️ Gov Authorization', icon: <Landmark className="w-4 h-4 text-indigo-400" />, badge: 'CDSCO', highlight: true, allowedRoles: ['REGULATOR_AUDITOR', 'ADMIN'] },
        { to: '/pipeline', label: '🔄 Supply Chain Pipeline', icon: <GitBranch className="w-4 h-4 text-cyan-400" />, highlight: true },
        { to: '/alerts', label: 'Central Alert Hub', icon: <AlertOctagon className="w-4 h-4" /> },
        { to: '/audit', label: 'Audit Trail', icon: <History className="w-4 h-4" />, allowedRoles: ['REGULATOR_AUDITOR', 'ADMIN'] },
        { to: '/settings', label: 'System Configuration', icon: <Settings className="w-4 h-4" />, allowedRoles: ['ADMIN'] },
      ],
    };

    return [coreGroup, forwardGroup, reverseGroup, securityGroup, auditGroup];
  };

  const navGroups = getNavGroups();

  return (
    <aside
      className={`relative flex flex-col bg-slate-950/90 border-r border-slate-800/80 transition-all duration-300 z-30 ${
        collapsed ? 'w-16' : 'w-64'
      } ${className}`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800/80 bg-slate-950">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent block">
                PHARMASAFE
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-mono">
                INTELLIGENCE
              </span>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="mx-auto p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Shield className="w-5 h-5" />
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/60"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Role Badge Pill */}
      {!collapsed && (
        <div className="px-4 py-2.5 bg-slate-900/40 border-b border-slate-800/60">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-500">Active Persona</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded">
              {currentRole.replace('_', ' ')}
            </span>
          </div>
        </div>
      )}

      {/* Navigation Groups List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx}>
            {!collapsed && (
              <h5 className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {group.title}
              </h5>
            )}

            <div className="space-y-1">
              {group.items.map((item, iIdx) => {
                const isLocked = item.allowedRoles && !item.allowedRoles.includes(currentRole);

                if (isLocked) {
                  return (
                    <div
                      key={iIdx}
                      title={`${item.label} (Locked - Requires ${item.allowedRoles?.join(' or ')})`}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 bg-slate-900/20 cursor-not-allowed opacity-50 ${
                        collapsed ? 'justify-center px-0' : ''
                      }`}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      {!collapsed && <span className="truncate flex-1 line-through">{item.label}</span>}
                      {!collapsed && <Lock className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
                    </div>
                  );
                }

                return (
                  <NavLink
                    key={iIdx}
                    to={item.to}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                        isActive
                          ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                          : item.highlight
                          ? 'text-slate-200 hover:text-white hover:bg-slate-900 border border-slate-800/80 bg-slate-900/40'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                      } ${collapsed ? 'justify-center px-0' : ''}`
                    }
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded tracking-wider ${
                          item.badge === 'Critical'
                            ? 'bg-red-950 text-red-400 border border-red-800/60'
                            : 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Security Baseline */}
      {!collapsed && (
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 text-[11px] text-slate-500 font-mono flex items-center justify-between">
          <span>SHA-256 Ledger</span>
          <span className="text-emerald-400 font-semibold">● SECURE</span>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
