import React from 'react';
import { AlertCircle, AlertTriangle, Info, Skull, ArrowRight } from 'lucide-react';
import StatusBadge from './StatusBadge';

interface AlertCardProps {
  id: string;
  type: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  description: string;
  batchNumber?: string;
  entityName?: string;
  timestamp: string;
  actionRequired?: string;
  isAcknowledged?: boolean;
  onAcknowledge?: (id: string) => void;
  onViewDetails?: (batchNumber?: string) => void;
  className?: string;
}

export const AlertCard: React.FC<AlertCardProps> = ({
  id,
  type,
  title,
  description,
  batchNumber,
  entityName,
  timestamp,
  actionRequired,
  isAcknowledged = false,
  onAcknowledge,
  onViewDetails,
  className = '',
}) => {
  const typeConfig = {
    CRITICAL: {
      border: 'border-red-500/50',
      bg: 'bg-red-950/20',
      icon: <Skull className="w-5 h-5 text-red-400" />,
      glow: 'shadow-[0_0_20px_rgba(239,68,68,0.15)]',
    },
    HIGH: {
      border: 'border-orange-500/40',
      bg: 'bg-orange-950/20',
      icon: <AlertTriangle className="w-5 h-5 text-orange-400" />,
      glow: '',
    },
    MEDIUM: {
      border: 'border-amber-500/30',
      bg: 'bg-amber-950/15',
      icon: <AlertCircle className="w-5 h-5 text-amber-400" />,
      glow: '',
    },
    LOW: {
      border: 'border-slate-800',
      bg: 'bg-slate-900/60',
      icon: <Info className="w-5 h-5 text-cyan-400" />,
      glow: '',
    },
    INFO: {
      border: 'border-slate-800',
      bg: 'bg-slate-900/60',
      icon: <Info className="w-5 h-5 text-blue-400" />,
      glow: '',
    },
  };

  const current = typeConfig[type] || typeConfig.INFO;

  return (
    <div className={`glass-panel p-5 rounded-xl border ${current.border} ${current.bg} ${current.glow} transition-all ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          {current.icon}
          <h4 className="text-sm font-bold text-white tracking-tight">{title}</h4>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={type} size="sm" />
          <span className="text-[11px] font-mono text-slate-400">{timestamp}</span>
        </div>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed pl-7 mb-3">{description}</p>

      {(batchNumber || entityName) && (
        <div className="pl-7 flex flex-wrap gap-4 text-xs text-slate-400 mb-3 font-mono">
          {batchNumber && (
            <span>Batch ID: <strong className="text-white">{batchNumber}</strong></span>
          )}
          {entityName && (
            <span>Entity: <strong className="text-white">{entityName}</strong></span>
          )}
        </div>
      )}

      {actionRequired && (
        <div className="ml-7 p-2.5 rounded-lg bg-red-950/40 border border-red-900/50 text-xs text-red-300 mb-3">
          <strong>Mandated Protocol:</strong> {actionRequired}
        </div>
      )}

      <div className="pl-7 flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
        <div>
          {isAcknowledged ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1">✓ Acknowledged</span>
          ) : (
            onAcknowledge && (
              <button
                onClick={() => onAcknowledge(id)}
                className="text-slate-400 hover:text-white font-medium underline decoration-slate-600 underline-offset-2"
              >
                Mark Acknowledged
              </button>
            )
          )}
        </div>

        {onViewDetails && (
          <button
            onClick={() => onViewDetails(batchNumber)}
            className="inline-flex items-center gap-1 font-semibold text-cyan-400 hover:text-cyan-300 hover:underline"
          >
            <span>Inspect Record</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default AlertCard;
