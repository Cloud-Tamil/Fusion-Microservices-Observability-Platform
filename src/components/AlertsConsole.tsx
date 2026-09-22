import React, { useState } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  VolumeX, 
  Clock, 
  Radio, 
  Users, 
  Filter, 
  Send,
  Plus
} from 'lucide-react';
import { AlertRule, AlertSilence } from '../types';

interface AlertsConsoleProps {
  alerts: AlertRule[];
  onSilenceAlert: (alertName: string, durationMinutes: number) => void;
  silences: AlertSilence[];
}

export const AlertsConsole: React.FC<AlertsConsoleProps> = ({
  alerts,
  onSilenceAlert,
  silences,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'warning'>('all');
  const [silenceModalAlert, setSilenceModalAlert] = useState<string | null>(null);
  const [silenceDuration, setSilenceDuration] = useState<number>(60);
  const [silenceComment, setSilenceComment] = useState<string>('Investigating upstream database latency');

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity === 'all') return true;
    return a.severity === filterSeverity;
  });

  const firingAlerts = alerts.filter((a) => a.status === 'firing');

  const handleConfirmSilence = () => {
    if (silenceModalAlert) {
      onSilenceAlert(silenceModalAlert, silenceDuration);
      setSilenceModalAlert(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Status & Alertmanager HA Mesh */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-400 bg-rose-950/80 px-2.5 py-1 rounded-md border border-rose-800/60">
                Alertmanager v0.27 Clustered Mesh
              </span>
              <span className="text-xs text-slate-400 font-mono">Gossip Protocol • Deduplication Active</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Cluster Alert Rules & Multi-Window SLO Burn Monitors
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-3xl">
              Monitors error budget consumption rates and cluster health. Alerts are routed to Slack, PagerDuty, 
              and Webhooks via a high availability dual-node Alertmanager mesh.
            </p>
          </div>

          <div className="flex items-center space-x-2 font-mono text-xs">
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-center">
              <span className="text-slate-500 text-[10px] uppercase block">Firing Alerts</span>
              <span className={`text-xl font-extrabold ${firingAlerts.length > 0 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                {firingAlerts.length}
              </span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-center">
              <span className="text-slate-500 text-[10px] uppercase block">Active Silences</span>
              <span className="text-xl font-extrabold text-amber-400">
                {silences.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* HA Alertmanager Peer Nodes Status */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center space-x-2 font-mono">
            <Radio className="h-4 w-4 text-cyan-400 animate-pulse" />
            <span className="text-white font-bold">HA Cluster State: 2 Peers Connected</span>
          </div>
          <span className="text-emerald-400 font-mono text-[11px]">Gossip Sync: 100% In-Sync</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
            <div>
              <div className="text-slate-300 font-bold">alertmanager-node1:9093</div>
              <div className="text-[10px] text-slate-500">Leader • 0ms drift • Uptime: 48h</div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
              HEALTHY
            </span>
          </div>
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
            <div>
              <div className="text-slate-300 font-bold">alertmanager-node2:9094</div>
              <div className="text-[10px] text-slate-500">Peer Replica • Mesh Gossip: 1.1ms</div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
              HEALTHY
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <Filter className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-slate-400 font-medium">Filter Severity:</span>
          {(['all', 'critical', 'warning'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2.5 py-1 rounded-lg border font-mono text-[11px] capitalize transition ${
                filterSeverity === sev
                  ? 'bg-slate-800 text-cyan-400 border-cyan-800'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.map((alert) => {
          const isFiring = alert.status === 'firing';
          const isSilenced = silences.some((s) => s.matchers.some((m) => m.value === alert.name));

          return (
            <div
              key={alert.name}
              className={`p-4 rounded-xl border transition ${
                isFiring
                  ? 'bg-rose-950/30 border-rose-800 ring-1 ring-rose-500'
                  : isSilenced
                  ? 'bg-slate-900/60 border-slate-800/80 opacity-70'
                  : 'bg-slate-900/90 border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    isFiring
                      ? 'bg-rose-500/20 text-rose-400 animate-pulse'
                      : alert.severity === 'critical'
                      ? 'bg-rose-950 text-rose-400'
                      : 'bg-amber-950 text-amber-400'
                  }`}>
                    {isFiring ? <AlertTriangle className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-white font-mono text-sm">{alert.name}</h4>
                      <span className={`px-2 py-0.2 rounded text-[10px] font-mono uppercase font-bold ${
                        alert.severity === 'critical'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}>
                        {alert.severity}
                      </span>
                      {alert.slo && (
                        <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800">
                          SLO: {alert.slo}
                        </span>
                      )}
                      {isSilenced && (
                        <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                          SILENCED
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{alert.summary}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 font-mono text-xs">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase block">Current / Target</span>
                    <span className={`font-bold ${isFiring ? 'text-rose-400' : 'text-slate-300'}`}>
                      {alert.currentValue} / {alert.threshold}
                    </span>
                  </div>
                  <button
                    onClick={() => setSilenceModalAlert(alert.name)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono flex items-center transition"
                  >
                    <VolumeX className="h-3.5 w-3.5 mr-1" />
                    Silence
                  </button>
                </div>
              </div>

              {/* Expression & Rule Details */}
              <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs font-mono">
                <div className="md:col-span-2">
                  <span className="text-slate-500 text-[10px] uppercase block">PromQL Condition</span>
                  <span className="text-cyan-400 bg-slate-950 px-2 py-1 rounded border border-slate-800 block truncate">
                    {alert.expr} (for: {alert.duration})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Route &amp; Team</span>
                  <span className="text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-800 block truncate">
                    team={alert.team} → #slack-alerts
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Silence Alert Modal */}
      {silenceModalAlert && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center">
                <VolumeX className="h-5 w-5 mr-2 text-amber-400" />
                Create Alertmanager Silence
              </h3>
              <button
                onClick={() => setSilenceModalAlert(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-300">
              Silencing target rule: <span className="font-mono text-cyan-400 font-bold">{silenceModalAlert}</span>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Silence Duration</label>
              <select
                value={silenceDuration}
                onChange={(e) => setSilenceDuration(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
              >
                <option value={15}>15 Minutes (Temporary maintenance)</option>
                <option value={60}>1 Hour (Standard investigation)</option>
                <option value={240}>4 Hours (Extended incident mitigation)</option>
                <option value={1440}>24 Hours (Planned rollout freeze)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Investigation Comment / Ticket</label>
              <input
                type="text"
                value={silenceComment}
                onChange={(e) => setSilenceComment(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setSilenceModalAlert(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSilence}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold"
              >
                Apply Silence to Mesh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
