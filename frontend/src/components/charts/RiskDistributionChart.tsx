import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';

interface RiskDistributionChartProps {
  data: { category: string; count: number; color: string }[];
  title?: string;
  height?: number;
}

export const RiskDistributionChart: React.FC<RiskDistributionChartProps> = ({
  data,
  title,
  height = 220,
}) => {
  return (
    <div className="w-full">
      {title && (
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">{title}</h4>
      )}
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="category" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#f8fafc', fontWeight: 600 }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RiskDistributionChart;
