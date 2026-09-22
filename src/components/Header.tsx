import React from 'react';
import { 
  Activity, 
  Layers, 
  BarChart2, 
  Bell, 
  Database, 
  FileText, 
  Zap, 
  Flame, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  RotateCcw
} from 'lucide-react';
import { ChaosState } from '../types';

interface HeaderProps {
  activeTab: 'topology' | 'grafana' | 'prometheus' | 'alerts' | 'catalog' | 'docs';
  onSelectTab: (tab: 'topology' | 'grafana' | 'prometheus' | 'alerts' | 'catalog' | 'docs') => void;
  clusterStats: {
    rps: number;
    latencyP95Ms: number;
    errorRatePercent: number;
    availability: string;
    burnRate5m: string;
  };
  chaosState: ChaosState;
  onTriggerChaos: (profile: ChaosState['activeProfile']) => void;
  firingAlertsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  clusterStats,
  chaosState,
  onTriggerChaos,
  firingAlertsCount,
}) => {
  const isHealthy = clusterStats.errorRatePercent < 2 && clusterStats.latencyP95Ms < 500;
  const isDegraded = !isHealthy && clusterStats.errorRatePercent < 10;
  const isCritical = clusterStats.errorRatePercent >= 10 || clusterStats.latencyP95Ms >= 1000;

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-50">
      {/* Top Bar: Brand, Live Golden Signals, Chaos Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Health Status */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">Fusion</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-cyan-950 text-cyan-400 border border-cyan-800">
                HA Microservices v2.5
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Cluster Mesh:</span>
              {isHealthy && <span className="text-emerald-400 font-medium">Nominal (10/10 Online)</span>}
              {isDegraded && <span className="text-amber-400 font-medium">Degraded Performance</span>}
              {isCritical && <span className="text-rose-400 font-medium font-semibold">Critical State</span>}
            </div>
          </div>
        </div>

        {/* Live Golden Signals Pill Metrics */}
        <div className="hidden lg:flex items-center space-x-3 bg-slate-950/70 border border-slate-800/80 rounded-xl px-4 py-1.5 text-xs font-mono">
          <div className="flex flex-col">
            <span className="text-slate-500 text-[10px] uppercase">RPS (Rate)</span>
            <span className="text-cyan-400 font-bold">{clusterStats.rps} req/s</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-800"></div>
          <div className="flex flex-col">
            <span className="text-slate-500 text-[10px] uppercase">Errors</span>
            <span className={`font-bold ${clusterStats.errorRatePercent > 5 ? 'text-rose-400' : 'text-slate-300'}`}>
              {clusterStats.errorRatePercent}%
            </span>
          </div>
          <div className="h-6 w-[1px] bg-slate-800"></div>
          <div className="flex flex-col">
            <span className="text-slate-500 text-[10px] uppercase">p95 Latency</span>
            <span className={`font-bold ${clusterStats.latencyP95Ms > 500 ? 'text-amber-400' : 'text-slate-300'}`}>
              {clusterStats.latencyP95Ms} ms
            </span>
          </div>
          <div className="h-6 w-[1px] bg-slate-800"></div>
          <div className="flex flex-col">
            <span className="text-slate-500 text-[10px] uppercase">SLO Avail</span>
            <span className="text-emerald-400 font-bold">{clusterStats.availability}%</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-800"></div>
          <div className="flex flex-col">
            <span className="text-slate-500 text-[10px] uppercase">Burn Rate</span>
            <span className={`font-bold ${parseFloat(clusterStats.burnRate5m) > 6 ? 'text-rose-400' : 'text-slate-400'}`}>
              {clusterStats.burnRate5m}x
            </span>
          </div>
        </div>

        {/* Chaos & Load Simulator Quick Actions */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1 space-x-1">
            <span className="text-[11px] text-slate-400 px-2 flex items-center font-medium">
              <Zap className="h-3 w-3 mr-1 text-amber-400" />
              Chaos:
            </span>
            <button
              id="chaos-btn-load"
              onClick={() => onTriggerChaos('high-load')}
              className={`px-2 py-1 text-xs rounded transition ${
                chaosState.activeProfile === 'high-load'
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
              title="Inject 1800+ RPS Traffic Spike"
            >
              Load
            </button>
            <button
              id="chaos-btn-latency"
              onClick={() => onTriggerChaos('latency-spike')}
              className={`px-2 py-1 text-xs rounded transition ${
                chaosState.activeProfile === 'latency-spike'
                  ? 'bg-amber-600 text-white font-medium'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
              title="Inject 1.45s p95 latency to trigger Prometheus alert"
            >
              Latency
            </button>
            <button
              id="chaos-btn-error"
              onClick={() => onTriggerChaos('error-surge')}
              className={`px-2 py-1 text-xs rounded transition ${
                chaosState.activeProfile === 'error-surge'
                  ? 'bg-rose-600 text-white font-medium'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
              title="Inject 8.5% 5xx errors to trigger SLO burn rate alert"
            >
              5xx Surge
            </button>
            <button
              id="chaos-btn-reset"
              onClick={() => onTriggerChaos('normal')}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
              title="Reset to Normal State"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto no-scrollbar space-x-1 border-t border-slate-800/80">
        <button
          id="tab-topology"
          onClick={() => onSelectTab('topology')}
          className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition whitespace-nowrap ${
            activeTab === 'topology'
              ? 'border-cyan-500 text-cyan-400 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Microservices Mesh</span>
        </button>

        <button
          id="tab-grafana"
          onClick={() => onSelectTab('grafana')}
          className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition whitespace-nowrap ${
            activeTab === 'grafana'
              ? 'border-cyan-500 text-cyan-400 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <BarChart2 className="h-4 w-4" />
          <span>Grafana Dashboards</span>
        </button>

        <button
          id="tab-prometheus"
          onClick={() => onSelectTab('prometheus')}
          className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition whitespace-nowrap ${
            activeTab === 'prometheus'
              ? 'border-cyan-500 text-cyan-400 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>Prometheus & PromQL</span>
        </button>

        <button
          id="tab-alerts"
          onClick={() => onSelectTab('alerts')}
          className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition whitespace-nowrap ${
            activeTab === 'alerts'
              ? 'border-cyan-500 text-cyan-400 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Bell className="h-4 w-4" />
          <span>Alertmanager & HA</span>
          {firingAlertsCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-bold animate-pulse">
              {firingAlertsCount}
            </span>
          )}
        </button>

        <button
          id="tab-catalog"
          onClick={() => onSelectTab('catalog')}
          className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition whitespace-nowrap ${
            activeTab === 'catalog'
              ? 'border-cyan-500 text-cyan-400 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Database className="h-4 w-4" />
          <span>Catalog UI (CRUD)</span>
        </button>

        <button
          id="tab-docs"
          onClick={() => onSelectTab('docs')}
          className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition whitespace-nowrap ${
            activeTab === 'docs'
              ? 'border-cyan-500 text-cyan-400 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Deploy Commands & Manifests</span>
        </button>
      </div>
    </header>
  );
};
