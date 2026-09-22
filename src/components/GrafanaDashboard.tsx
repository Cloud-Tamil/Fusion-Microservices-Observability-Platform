import React, { useState } from 'react';
import { 
  BarChart2, 
  Clock, 
  RefreshCw, 
  Info, 
  ShieldCheck, 
  AlertCircle, 
  TrendingUp, 
  Zap,
  Activity,
  Layers,
  ChevronDown,
  ExternalLink
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  AreaChart, 
  Area,
  ReferenceLine
} from 'recharts';
import { TimeSeriesPoint } from '../types';

interface GrafanaDashboardProps {
  telemetryPoints: TimeSeriesPoint[];
  currentStats: {
    rps: number;
    latencyP95Ms: number;
    errorRatePercent: number;
    availability: string;
    burnRate5m: string;
  };
  onRefresh: () => void;
  isAutoRefreshing: boolean;
  onToggleAutoRefresh: () => void;
}

export const GrafanaDashboard: React.FC<GrafanaDashboardProps> = ({
  telemetryPoints,
  currentStats,
  onRefresh,
  isAutoRefreshing,
  onToggleAutoRefresh,
}) => {
  const [timeRange, setTimeRange] = useState<'5m' | '15m' | '1h'>('5m');
  const [selectedPanelQuery, setSelectedPanelQuery] = useState<string | null>(null);

  const burnRateNum = parseFloat(currentStats.burnRate5m);
  const isBurnCritical = burnRateNum >= 14.4;
  const isBurnWarning = burnRateNum >= 6.0 && burnRateNum < 14.4;

  const availabilityNum = parseFloat(currentStats.availability);
  const isAvailGood = availabilityNum >= 99.9;
  const isAvailWarning = availabilityNum >= 99.5 && availabilityNum < 99.9;

  return (
    <div className="space-y-6">
      {/* Grafana Dashboard Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <BarChart2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Fusion Metrics — SLO Overview & Golden Signals
                </h2>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                  UID: slo-overview
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Provisioned Grafana 11.3.1 telemetry dashboard for cluster availability, burn rates, and RED metrics.
              </p>
            </div>
          </div>

          {/* Time Controls & Refresh */}
          <div className="flex items-center space-x-2">
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-1 flex items-center space-x-1 text-xs font-mono">
              <Clock className="h-3.5 w-3.5 text-slate-500 ml-1.5" />
              {(['5m', '15m', '1h'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-2 py-1 rounded transition ${
                    timeRange === range
                      ? 'bg-slate-800 text-cyan-400 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Last {range}
                </button>
              ))}
            </div>

            <button
              id="btn-refresh-telemetry"
              onClick={onRefresh}
              className="p-2 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-lg text-xs flex items-center transition"
              title="Manual Poll"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Poll
            </button>

            <button
              id="btn-auto-refresh"
              onClick={onToggleAutoRefresh}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition flex items-center ${
                isAutoRefreshing
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              <span className={`w-2 h-2 rounded-full mr-1.5 ${isAutoRefreshing ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
              {isAutoRefreshing ? 'Live (3s)' : 'Paused'}
            </button>
          </div>
        </div>
      </div>

      {/* Top 4 Stat Panels (Direct Replica of Grafana SLO Overview) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Availability SLO */}
        <div className={`p-4 rounded-xl border transition relative overflow-hidden ${
          isAvailGood
            ? 'bg-emerald-950/20 border-emerald-900/50'
            : isAvailWarning
            ? 'bg-amber-950/20 border-amber-900/50'
            : 'bg-rose-950/20 border-rose-900/50'
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Availability (5m)</span>
            <button
              onClick={() => setSelectedPanelQuery('job:fusion_slo_availability:5m')}
              className="hover:text-cyan-400"
              title="Inspect PromQL Target"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className={`text-3xl font-extrabold font-mono ${
              isAvailGood ? 'text-emerald-400' : isAvailWarning ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {currentStats.availability}%
            </div>
            <span className="text-xs text-slate-500 font-mono">Target: 99.900%</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center">
            <ShieldCheck className="h-3.5 w-3.5 mr-1 text-emerald-400" />
            Rolling 5-minute success ratio
          </div>
        </div>

        {/* Stat 2: Burn Rate (5m) */}
        <div className={`p-4 rounded-xl border transition relative overflow-hidden ${
          isBurnCritical
            ? 'bg-rose-950/30 border-rose-800 ring-1 ring-rose-500 animate-pulse'
            : isBurnWarning
            ? 'bg-amber-950/30 border-amber-800'
            : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Burn Rate (5m)</span>
            <button
              onClick={() => setSelectedPanelQuery('job:fusion_slo_burn_rate:5m')}
              className="hover:text-cyan-400"
              title="Inspect PromQL Target"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className={`text-3xl font-extrabold font-mono ${
              isBurnCritical ? 'text-rose-400' : isBurnWarning ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {currentStats.burnRate5m}x
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Alert &gt; 14.4x</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {isBurnCritical ? (
              <span className="text-rose-400 font-semibold">Consuming 2% budget / hour!</span>
            ) : (
              <span>Within safe burn threshold</span>
            )}
          </div>
        </div>

        {/* Stat 3: 5xx Error Rate */}
        <div className={`p-4 rounded-xl border transition relative overflow-hidden ${
          currentStats.errorRatePercent > 5.0
            ? 'bg-rose-950/20 border-rose-900/50'
            : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Error Rate (5m)</span>
            <button
              onClick={() => setSelectedPanelQuery('job:fusion_error_rate:5m')}
              className="hover:text-cyan-400"
              title="Inspect PromQL Target"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className={`text-3xl font-extrabold font-mono ${
              currentStats.errorRatePercent > 5.0 ? 'text-rose-400' : 'text-slate-200'
            }`}>
              {currentStats.errorRatePercent}%
            </div>
            <span className="text-xs text-slate-500 font-mono">Alert &gt; 5.00%</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {currentStats.errorRatePercent > 5.0 ? 'Triggering FusionHighErrorRate' : 'Nominal cluster error level'}
          </div>
        </div>

        {/* Stat 4: p95 Latency */}
        <div className={`p-4 rounded-xl border transition relative overflow-hidden ${
          currentStats.latencyP95Ms > 1000
            ? 'bg-amber-950/20 border-amber-900/50'
            : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">p95 Latency (5m)</span>
            <button
              onClick={() => setSelectedPanelQuery('job:fusion_latency_p95:5m')}
              className="hover:text-cyan-400"
              title="Inspect PromQL Target"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className={`text-3xl font-extrabold font-mono ${
              currentStats.latencyP95Ms > 1000 ? 'text-amber-400' : 'text-slate-200'
            }`}>
              {currentStats.latencyP95Ms} ms
            </div>
            <span className="text-xs text-slate-500 font-mono">Alert &gt; 1000ms</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {currentStats.latencyP95Ms > 1000 ? 'Latency alert threshold crossed' : 'Target SLA &lt; 50ms'}
          </div>
        </div>
      </div>

      {/* PromQL Inspector Modal / Drawer if clicked */}
      {selectedPanelQuery && (
        <div className="bg-slate-950 border border-cyan-800/80 rounded-xl p-4 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-cyan-400 font-bold uppercase">PromQL Target:</span>
            <span className="text-slate-200 bg-slate-900 px-2 py-1 rounded border border-slate-800">
              {selectedPanelQuery}
            </span>
          </div>
          <button
            onClick={() => setSelectedPanelQuery(null)}
            className="text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800"
          >
            Close
          </button>
        </div>
      )}

      {/* Golden Signals Time-Series Panels (2x2 Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Throughput & Rate (RPS) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center">
                <Activity className="h-4 w-4 mr-1.5 text-cyan-400" />
                Cluster Throughput (Rate)
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                expr: sum(rate(http_requests_total[5m])) by (job)
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/70 border border-cyan-800/50 px-2 py-1 rounded">
              {currentStats.rps} req/s
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetryPoints}>
                <defs>
                  <linearGradient id="rpsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', fontSize: '11px', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Area type="monotone" dataKey="rps" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#rpsGrad)" name="Total RPS" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Panel 2: Latency Distribution (p50 vs p95) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center">
                <Clock className="h-4 w-4 mr-1.5 text-amber-400" />
                Request Duration (Latency p50 vs p95)
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/70 border border-amber-800/50 px-2 py-1 rounded">
              p95: {currentStats.latencyP95Ms} ms
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={telemetryPoints}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit="ms" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', fontSize: '11px', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <ReferenceLine y={1000} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Alert > 1s', fill: '#ef4444', fontSize: 10 }} />
                <Line type="monotone" dataKey="latencyP95" stroke="#f59e0b" strokeWidth={2} dot={false} name="p95 Latency" />
                <Line type="monotone" dataKey="latencyP50" stroke="#38bdf8" strokeWidth={1.5} dot={false} strokeDasharray="4 4" name="p50 Median" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Panel 3: Error Rate % & SLO Burn Rate */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center">
                <AlertCircle className="h-4 w-4 mr-1.5 text-rose-400" />
                5xx Error Rate % &amp; Warning Threshold
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                expr: job:fusion_error_rate:5m
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950/70 border border-rose-800/50 px-2 py-1 rounded">
              {currentStats.errorRatePercent}%
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetryPoints}>
                <defs>
                  <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit="%" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', fontSize: '11px', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <ReferenceLine y={5.0} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'SLO Threshold 5%', fill: '#f43f5e', fontSize: 10 }} />
                <Area type="monotone" dataKey="errorRate" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#errGrad)" name="Error Rate %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Panel 4: Redis Cache Hit Ratio & Postgres Pool Saturation */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center">
                <Layers className="h-4 w-4 mr-1.5 text-emerald-400" />
                Cache Efficiency &amp; Database Pool Saturation
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                expr: rate(fusion_cache_hits_total[5m]) / total
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/50 px-2 py-1 rounded">
              Cache: 91.2%
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={telemetryPoints}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', fontSize: '11px', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Line type="monotone" dataKey="cacheHitRatio" stroke="#10b981" strokeWidth={2} dot={false} name="Redis Cache Hit Ratio %" />
                <Line type="monotone" dataKey="dbConnections" stroke="#8b5cf6" strokeWidth={1.5} dot={false} strokeDasharray="3 3" name="Postgres Pool Active %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
