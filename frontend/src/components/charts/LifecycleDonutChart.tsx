import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';

interface LifecycleDonutProps {
  data: { name: string; value: number; color: string }[];
  title?: string;
  height?: number;
}

export const LifecycleDonutChart: React.FC<LifecycleDonutProps> = ({
  data,
  title,
  height = 220,
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="w-full">
      {title && (
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{title}</h4>
      )}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div style={{ width: '180px', height }} className="relative flex items-center justify-center">
          <ResponsiveContainer>
            <PieChart>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Pie
                data={data}
                innerRadius={55}
                outerRadius={75}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-lg font-bold text-white tracking-tight">{total.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Total</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-300 font-medium">{item.name}</span>
              </div>
              <span className="font-mono text-slate-400">
                {item.value.toLocaleString()} ({Math.round((item.value / total) * 100)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LifecycleDonutChart;
