import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface MetricTrendChartProps {
  title?: string;
  data: { name: string; value: number; secondaryValue?: number }[];
  primaryLabel?: string;
  secondaryLabel?: string;
  primaryColor?: string;
  secondaryColor?: string;
  height?: number;
}

export const MetricTrendChart: React.FC<MetricTrendChartProps> = ({
  title,
  data,
  primaryLabel = 'Batches',
  secondaryLabel,
  primaryColor = '#06b6d4',
  secondaryColor = '#f43f5e',
  height = 240,
}) => {
  return (
    <div className="w-full">
      {title && (
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">{title}</h4>
      )}
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="primaryGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={primaryColor} stopOpacity={0.4} />
                <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
              </linearGradient>
              {secondaryLabel && (
                <linearGradient id="secondaryGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={secondaryColor} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={secondaryColor} stopOpacity={0} />
                </linearGradient>
              )}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
              }}
              labelStyle={{ color: '#f8fafc', fontWeight: 600, marginBottom: '4px' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              name={primaryLabel}
              stroke={primaryColor}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#primaryGrad)"
            />
            {secondaryLabel && (
              <Area
                type="monotone"
                dataKey="secondaryValue"
                name={secondaryLabel}
                stroke={secondaryColor}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#secondaryGrad)"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MetricTrendChart;
