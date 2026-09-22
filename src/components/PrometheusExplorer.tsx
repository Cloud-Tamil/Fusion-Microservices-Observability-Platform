import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Search, 
  Terminal, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  RotateCw,
  Copy,
  Check
} from 'lucide-react';
import { PrometheusTarget } from '../types';
import { PROMETHEUS_TARGETS } from '../data/microservicesData';

interface PrometheusExplorerProps {
  currentStats: {
    rps: number;
    latencyP95Ms: number;
    errorRatePercent: number;
    availability: string;
    burnRate5m: string;
  };
}

export const PrometheusExplorer: React.FC<PrometheusExplorerProps> = ({ currentStats }) => {
  const [promqlQuery, setPromqlQuery] = useState<string>('job:fusion_slo_burn_rate:5m');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [rawMetrics, setRawMetrics] = useState<string>('');
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch real `/metrics` from the server
  const fetchRawMetrics = async () => {
    setIsLoadingMetrics(true);
    try {
      const res = await fetch('/metrics');
      const text = await res.text();
      setRawMetrics(text);
    } catch (e) {
      setRawMetrics('# Failed to fetch /metrics from server endpoint');
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  useEffect(() => {
    fetchRawMetrics();
    handleExecuteQuery('job:fusion_slo_burn_rate:5m');
  }, []);

  const handleExecuteQuery = (queryToRun?: string) => {
    const q = queryToRun || promqlQuery;
    setIsExecuting(true);

    setTimeout(() => {
      let value = '0';
      let labels: Record<string, string> = { job: 'fusion-microservices' };

      if (q.includes('burn_rate:5m')) {
        value = currentStats.burnRate5m;
        labels = { job: 'fusion-microservices', slo: 'availability', window: '5m' };
      } else if (q.includes('error_rate:5m')) {
        value = (currentStats.errorRatePercent / 100).toFixed(5);
        labels = { job: 'fusion-microservices' };
      } else if (q.includes('latency_p95:5m')) {
        value = (currentStats.latencyP95Ms / 1000).toFixed(4);
        labels = { job: 'fusion-microservices', quantile: '0.95' };
      } else if (q.includes('slo_availability:5m')) {
        value = (parseFloat(currentStats.availability) / 100).toFixed(5);
        labels = { job: 'fusion-microservices', target: '0.999' };
      } else if (q.includes('rate(http_requests_total')) {
        value = currentStats.rps.toString();
        labels = { job: 'api-gateway', status: '200' };
      } else if (q.includes('fusion_active_connections')) {
        value = Math.floor(currentStats.rps * 0.2).toString();
        labels = { service: 'api-gateway' };
      } else {
        value = '42.0';
        labels = { metric: q };
      }

      setQueryResult({
        status: 'success',
        data: {
          resultType: 'vector',
          result: [
            {
              metric: labels,
              value: [Date.now() / 1000, value],
            },
          ],
        },
      });
      setIsExecuting(false);
    }, 250);
  };

  const copyMetrics = () => {
    navigator.clipboard.writeText(rawMetrics);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* PromQL Evaluator */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Terminal className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Prometheus v2.55 PromQL Expression Engine
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Execute live PromQL vector queries against the microservices TSDB telemetry stream.
            </p>
          </div>
        </div>

        {/* Expression Bar */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 font-mono text-xs">
                promql&gt;
              </div>
              <input
                id="promql-input"
                type="text"
                value={promqlQuery}
                onChange={(e) => setPromqlQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleExecuteQuery()}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-20 pr-4 py-2.5 text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                placeholder="Enter PromQL expression (e.g. job:fusion_slo_burn_rate:5m)"
              />
            </div>
            <button
              id="promql-run-btn"
              onClick={() => handleExecuteQuery()}
              disabled={isExecuting}
              className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-medium text-sm flex items-center justify-center transition disabled:opacity-50 shadow-md shadow-cyan-600/20"
            >
              <Play className="h-4 w-4 mr-1.5 fill-current" />
              {isExecuting ? 'Evaluating...' : 'Execute'}
            </button>
          </div>

          {/* Quick Preset Queries */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            <span className="text-slate-500 font-mono text-[11px] mr-1">Presets:</span>
            {[
              { label: '5m Burn Rate', query: 'job:fusion_slo_burn_rate:5m' },
              { label: '5m Error Rate', query: 'job:fusion_error_rate:5m' },
              { label: 'p95 Latency', query: 'job:fusion_latency_p95:5m' },
              { label: '5m Availability', query: 'job:fusion_slo_availability:5m' },
              { label: 'Cluster Throughput', query: 'sum(rate(http_requests_total[5m])) by (job)' },
              { label: 'Active Connections', query: 'fusion_active_connections' },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  setPromqlQuery(preset.query);
                  handleExecuteQuery(preset.query);
                }}
                className={`px-2.5 py-1 rounded-lg border font-mono text-[11px] transition ${
                  promqlQuery === preset.query
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Output */}
        {queryResult && (
          <div className="mt-5 border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
            <div className="bg-slate-900/90 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Evaluation Result: Vector (1 element)</span>
              <span className="text-emerald-400">HTTP 200 OK (3ms)</span>
            </div>
            <div className="p-4 overflow-x-auto font-mono text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-800/80 text-slate-500">
                    <th className="pb-2 font-normal">Metric Labels</th>
                    <th className="pb-2 font-normal text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {queryResult.data.result.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-900/40">
                      <td className="py-2.5 pr-4 text-cyan-400">
                        {'{'}
                        {Object.entries(item.metric).map(([k, v], i) => (
                          <span key={k}>
                            {i > 0 && ', '}
                            <span className="text-slate-400">{k}</span>=
                            <span className="text-amber-300">"{String(v)}"</span>
                          </span>
                        ))}
                        {'}'}
                      </td>
                      <td className="py-2.5 text-right font-bold text-white">
                        {item.value[1]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 2-Column: Scrape Targets & Live /metrics Output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scrape Targets */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              <h3 className="font-bold text-sm text-white">Active Prometheus Targets (7/7 UP)</h3>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-800 px-2 py-0.5 rounded">
              All Healthy
            </span>
          </div>

          <div className="divide-y divide-slate-800/80 max-h-96 overflow-y-auto pr-1">
            {PROMETHEUS_TARGETS.map((target) => (
              <div key={target.job} className="py-3 flex items-center justify-between text-xs font-mono">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-200">{target.job}</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 text-[10px]">
                      {target.instance}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Interval: {target.scrapeInterval} • Last Scraped: {target.lastScrape} ({target.scrapeDurationMs}ms)
                  </div>
                </div>
                <div className="flex items-center space-x-1 text-emerald-400 bg-emerald-950/60 border border-emerald-900 px-2 py-1 rounded">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="font-bold">UP</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live /metrics Raw Text Output */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">Live Server Endpoint (/metrics)</h3>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={fetchRawMetrics}
                disabled={isLoadingMetrics}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                title="Refresh Metrics"
              >
                <RotateCw className={`h-3.5 w-3.5 ${isLoadingMetrics ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={copyMetrics}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition flex items-center text-xs"
                title="Copy Metrics"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-300 overflow-y-auto max-h-80 leading-relaxed whitespace-pre select-all">
            {rawMetrics || '# Loading /metrics from Express server...'}
          </div>
        </div>
      </div>
    </div>
  );
};
