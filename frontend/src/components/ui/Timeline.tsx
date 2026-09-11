import React from 'react';
import { CheckCircle, Circle, AlertTriangle, ShieldAlert } from 'lucide-react';

export interface TimelineEvent {
  title: string;
  stage: string;
  timestamp?: string;
  actor?: string;
  organization?: string;
  location?: string;
  quantity?: number;
  status: 'COMPLETED' | 'ACTIVE' | 'PENDING' | 'ALERT' | 'BLOCKED';
  details?: string;
}

interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ events, className = '' }) => {
  return (
    <div className={`relative pl-6 space-y-6 ${className}`}>
      {/* Vertical Track */}
      <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-slate-800" />

      {events.map((evt, idx) => {
        const isCompleted = evt.status === 'COMPLETED';
        const isActive = evt.status === 'ACTIVE';
        const isAlert = evt.status === 'ALERT' || evt.status === 'BLOCKED';

        return (
          <div key={idx} className="relative flex items-start gap-4 group">
            {/* Step Marker */}
            <div
              className={`absolute -left-6 mt-0.5 flex items-center justify-center w-6 h-6 rounded-full border-2 bg-slate-900 z-10 transition-all ${
                isCompleted
                  ? 'border-emerald-500 text-emerald-400'
                  : isActive
                  ? 'border-cyan-400 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                  : isAlert
                  ? 'border-rose-500 text-rose-400 shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                  : 'border-slate-700 text-slate-600'
              }`}
            >
              {isCompleted ? (
                <CheckCircle className="w-3.5 h-3.5" />
              ) : isAlert ? (
                <ShieldAlert className="w-3.5 h-3.5" />
              ) : isActive ? (
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              ) : (
                <Circle className="w-2.5 h-2.5" />
              )}
            </div>

            {/* Event Card */}
            <div className="flex-1 glass-panel p-4 rounded-xl border border-slate-800/80 group-hover:border-slate-700 transition-all">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-bold text-white tracking-wide uppercase">{evt.stage}</span>
                {evt.timestamp && (
                  <span className="text-[11px] font-mono text-slate-400">{evt.timestamp}</span>
                )}
              </div>

              <h4 className="text-sm font-semibold text-slate-200 mb-1">{evt.title}</h4>

              {(evt.organization || evt.location || evt.actor) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mt-2">
                  {evt.organization && <span><strong>Entity:</strong> {evt.organization}</span>}
                  {evt.actor && <span><strong>Actor:</strong> {evt.actor}</span>}
                  {evt.location && <span><strong>Location:</strong> {evt.location}</span>}
                  {evt.quantity != null && (
                    <span><strong>Units:</strong> <span className="font-mono text-cyan-300">{evt.quantity}</span></span>
                  )}
                </div>
              )}

              {evt.details && (
                <p className="mt-2 text-xs text-slate-400/90 leading-relaxed border-t border-slate-800/60 pt-2 italic">
                  {evt.details}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Timeline;
