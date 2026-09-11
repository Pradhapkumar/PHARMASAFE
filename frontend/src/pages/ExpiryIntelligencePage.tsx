import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, AlertTriangle, ArrowRight, TrendingDown, Clock, ShieldAlert } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import MetricCard from '../components/ui/MetricCard';
import MetricTrendChart from '../components/charts/MetricTrendChart';
import StatusBadge from '../components/ui/StatusBadge';
import riskService from '../services/riskService';

export const ExpiryIntelligencePage: React.FC = () => {
  const navigate = useNavigate();
  const [forecast, setForecast] = useState<any[]>([]);

  useEffect(() => {
    riskService.getExpiryForecast().then(res => setForecast(res));
  }, []);

  const chartData = [
    { name: '0-30d', value: 1420 },
    { name: '31-60d', value: 3850 },
    { name: '61-90d', value: 8200 },
    { name: '91-180d', value: 24500 },
    { name: '180+d', value: 110000 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Predictive Expiry Shelf-Life Intelligence"
        description="Forward shelf-life analytics forecasting inventory degradation horizons and auto-triggering pre-expiry reverse recall manifests"
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-amber-950/60 border border-amber-500/40 text-amber-400">
            Shelf-Life Horizon Forecaster
          </span>
        }
      />

      {/* Expiry Risk Horizon Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="0 - 30 Days (Critical Horizon)"
          value="1,420 Units"
          subtext="6 lots awaiting immediate quarantine"
          accentColor="rose"
        />
        <MetricCard
          title="31 - 60 Days (Warning Horizon)"
          value="3,850 Units"
          subtext="14 lots in distribution velocity watch"
          accentColor="amber"
        />
        <MetricCard
          title="61 - 90 Days (Advisory Horizon)"
          value="8,200 Units"
          subtext="29 lots scheduled for priority dispensing"
          accentColor="cyan"
        />
        <MetricCard
          title="Expected Unsold Salvage Risk"
          value="₹ 4.85 Lakh"
          subtext="Estimated reverse logistics salvage"
          accentColor="purple"
        />
      </div>

      {/* Chart: Days to Expiry vs Expected Stock */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Days-to-Expiry vs Warehouse Stock Distribution
            </h3>
            <p className="text-xs text-slate-400">Projected inventory volume across degradation time bands</p>
          </div>
          <span className="text-xs font-mono text-cyan-400">Predictive Modeling</span>
        </div>

        <MetricTrendChart
          data={chartData}
          primaryLabel="Inventory Boxes"
          primaryColor="#f59e0b"
          height={260}
        />
      </div>

      {/* Predictive Action Table */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
          Priority Reverse Logistics Pre-Quarantine Schedule
        </h3>

        <div className="space-y-3">
          {forecast.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-mono"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <strong className="text-white text-sm block">{item.range}</strong>
                  <span className="text-slate-400 font-sans">{item.batches} Lots Registered</span>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div>
                  <span className="text-slate-500 uppercase text-[10px] block">Stock At Risk</span>
                  <strong className="text-white">{item.units.toLocaleString()} boxes</strong>
                </div>

                <StatusBadge status={item.risk} size="sm" />

                <button
                  onClick={() => navigate('/returns')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-cyan-400 hover:text-white hover:bg-slate-700 font-bold"
                >
                  Schedule Return
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExpiryIntelligencePage;
