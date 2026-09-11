import React from 'react';
import { 
  ShieldCheck, AlertTriangle, XCircle, Skull, Clock, HelpCircle, 
  CheckCircle2, AlertOctagon, RotateCcw, Flame
} from 'lucide-react';

export type StatusType = 
  | 'MANUFACTURED'
  | 'IN_DISTRIBUTION'
  | 'AT_PHARMACY'
  | 'ACTIVE'
  | 'VALID'
  | 'AUTHENTIC'
  | 'NEAR_EXPIRY'
  | 'EXPIRED'
  | 'RECALLED'
  | 'FLAGGED_SUSPICIOUS'
  | 'SUSPICIOUS'
  | 'RETURN_INITIATED'
  | 'RETURN_IN_TRANSIT'
  | 'RECEIVED_AT_DISPOSAL'
  | 'DISPOSAL_IN_PROGRESS'
  | 'DESTROYED'
  | 'DEAD_BATCH'
  | 'DEAD_BATCH_REENTRY_DETECTED'
  | 'UNKNOWN_NOT_FOUND'
  | 'CRITICAL'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'INFO';

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '', size = 'md' }) => {
  const normalized = (status || '').toUpperCase().replace(/\s+/g, '_');

  let config = {
    label: status,
    bg: 'bg-slate-800',
    text: 'text-slate-300',
    border: 'border-slate-700',
    icon: <HelpCircle className="w-3.5 h-3.5" />,
    pulse: false,
  };

  switch (normalized) {
    case 'AUTHENTIC':
    case 'VALID':
    case 'ACTIVE':
    case 'AT_PHARMACY':
    case 'IN_DISTRIBUTION':
    case 'MANUFACTURED':
    case 'VERIFIED':
    case 'SUCCESS':
    case 'ALLOW':
    case 'PERMITTED':
      config = {
        label: status.replace(/_/g, ' '),
        bg: 'bg-emerald-950/40',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
        pulse: false,
      };
      break;

    case 'REVIEW':
    case 'PENDING_REVIEW':
      config = {
        label: status.replace(/_/g, ' '),
        bg: 'bg-amber-950/40',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
        icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
        pulse: false,
      };
      break;

    case 'BLOCK':
    case 'BLOCKED':
      config = {
        label: status.replace(/_/g, ' '),
        bg: 'bg-red-950/60',
        text: 'text-red-400',
        border: 'border-red-500/50',
        icon: <AlertOctagon className="w-3.5 h-3.5 text-red-400" />,
        pulse: false,
      };
      break;

    case 'TAKEN_DOWN':
      config = {
        label: 'TAKEN DOWN',
        bg: 'bg-rose-950/60',
        text: 'text-rose-300',
        border: 'border-rose-500/50',
        icon: <XCircle className="w-3.5 h-3.5 text-rose-400" />,
        pulse: false,
      };
      break;

    case 'NEAR_EXPIRY':
    case 'MEDIUM':
    case 'WARNING':
      config = {
        label: status.replace(/_/g, ' '),
        bg: 'bg-amber-950/40',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
        icon: <Clock className="w-3.5 h-3.5 text-amber-400" />,
        pulse: false,
      };
      break;

    case 'EXPIRED':
    case 'HIGH':
      config = {
        label: status.replace(/_/g, ' '),
        bg: 'bg-orange-950/40',
        text: 'text-orange-400',
        border: 'border-orange-500/30',
        icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />,
        pulse: false,
      };
      break;

    case 'RECALLED':
    case 'DISCREPANCY_FLAGGED':
      config = {
        label: status.replace(/_/g, ' '),
        bg: 'bg-rose-950/40',
        text: 'text-rose-400',
        border: 'border-rose-500/30',
        icon: <XCircle className="w-3.5 h-3.5 text-rose-400" />,
        pulse: false,
      };
      break;

    case 'RETURN_INITIATED':
    case 'RETURN_IN_TRANSIT':
    case 'RECEIVED_AT_DISPOSAL':
      config = {
        label: status.replace(/_/g, ' '),
        bg: 'bg-blue-950/40',
        text: 'text-blue-400',
        border: 'border-blue-500/30',
        icon: <RotateCcw className="w-3.5 h-3.5 text-blue-400" />,
        pulse: false,
      };
      break;

    case 'DESTROYED':
      config = {
        label: status.replace(/_/g, ' '),
        bg: 'bg-purple-950/40',
        text: 'text-purple-300',
        border: 'border-purple-500/30',
        icon: <Flame className="w-3.5 h-3.5 text-purple-400" />,
        pulse: false,
      };
      break;

    case 'DEAD_BATCH':
    case 'DEAD_BATCH_REENTRY_DETECTED':
    case 'CRITICAL':
    case 'POSSIBLE_RE-ENTRY':
      config = {
        label: status.replace(/_/g, ' '),
        bg: 'bg-red-950/60',
        text: 'text-red-400',
        border: 'border-red-500/50',
        icon: <Skull className="w-3.5 h-3.5 text-red-400" />,
        pulse: true,
      };
      break;

    case 'UNKNOWN_NOT_FOUND':
      config = {
        label: 'UNKNOWN / COUNTERFEIT',
        bg: 'bg-slate-900',
        text: 'text-rose-300',
        border: 'border-rose-600/40',
        icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />,
        pulse: false,
      };
      break;
  }

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center font-semibold tracking-wider uppercase rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses[size]} ${config.pulse ? 'animate-pulse ring-1 ring-red-500/50' : ''} ${className}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};

export default StatusBadge;
