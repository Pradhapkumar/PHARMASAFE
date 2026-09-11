import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  accentColor?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'purple' | 'blue';
  className?: string;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtext,
  change,
  trend = 'neutral',
  icon,
  accentColor = 'cyan',
  className = '',
  onClick,
}) => {
  const accentGlow = {
    cyan: 'hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]',
    emerald: 'hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]',
    amber: 'hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]',
    rose: 'hover:border-rose-500/40 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]',
    purple: 'hover:border-purple-500/40 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]',
    blue: 'hover:border-blue-500/40 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]',
  };

  const iconBg = {
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };

  return (
    <div
      onClick={onClick}
      className={`glass-panel p-5 rounded-xl border border-slate-800/80 transition-all duration-200 ${accentGlow[accentColor]} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        {icon && (
          <div className={`p-2 rounded-lg border ${iconBg[accentColor]}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl lg:text-3xl font-bold tracking-tight text-white">{value}</span>
        {change && (
          <span className={`inline-flex items-center text-xs font-semibold ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-slate-400'}`}>
            {trend === 'up' ? <ArrowUpRight className="w-3.5 h-3.5" /> : trend === 'down' ? <ArrowDownRight className="w-3.5 h-3.5" /> : null}
            {change}
          </span>
        )}
      </div>

      {subtext && (
        <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5 font-medium">{subtext}</p>
      )}
    </div>
  );
};

export default MetricCard;
