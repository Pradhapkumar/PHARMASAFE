import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumb: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(x => x);

  const routeNameMap: Record<string, string> = {
    dashboard: 'Command Center',
    batches: 'Batch Registry',
    register: 'Batch Registration',
    distributor: 'Distributor Intake',
    incoming: 'Incoming Batches',
    inventory: 'Inventory Ledger',
    transfers: 'Custody Transfers',
    verify: 'Scan & Verify',
    sales: 'Point-of-Sale Checkout',
    returns: 'Reverse Logistics',
    'chain-of-custody': 'Chain of Custody',
    disposal: 'Disposal Management',
    certificates: 'Destruction Certificates',
    'dead-batches': 'Dead Batch Registry',
    're-entry': 'Re-Entry Detection',
    'online-safety': 'Online Marketplace Safety',
    'ai-risk': 'AI Risk Intelligence',
    'expiry-intelligence': 'Expiry Analytics',
    alerts: 'Central Alert Hub',
    audit: 'Compliance Audit Trail',
    compliance: 'Regulator Dashboard',
    settings: 'System Configuration',
  };

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
      <Link
        to="/dashboard"
        className="flex items-center gap-1 text-slate-400 hover:text-cyan-400 transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Home</span>
      </Link>

      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const displayName = routeNameMap[value.toLowerCase()] || value;

        return (
          <React.Fragment key={to}>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            {isLast ? (
              <span className="font-semibold text-slate-200 capitalize truncate max-w-[200px]">
                {displayName}
              </span>
            ) : (
              <Link to={to} className="hover:text-cyan-400 capitalize transition-colors">
                {displayName}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
