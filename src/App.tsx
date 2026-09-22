import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { TopologyView } from './components/TopologyView';
import { GrafanaDashboard } from './components/GrafanaDashboard';
import { PrometheusExplorer } from './components/PrometheusExplorer';
import { AlertsConsole } from './components/AlertsConsole';
import { CatalogManager } from './components/CatalogManager';
import { ArchitectureDocs } from './components/ArchitectureDocs';
import { 
  MicroserviceNode, 
  CatalogItem, 
  AlertRule, 
  AlertSilence, 
  TimeSeriesPoint, 
  ChaosState 
} from './types';
import { 
  INITIAL_SERVICES, 
  INITIAL_ITEMS, 
  INITIAL_ALERTS 
} from './data/microservicesData';

export default function App() {
  const [activeTab, setActiveTab] = useState<'topology' | 'grafana' | 'prometheus' | 'alerts' | 'catalog' | 'docs'>('topology');

  // Cluster State
  const [services, setServices] = useState<MicroserviceNode[]>(INITIAL_SERVICES);
  const [items, setItems] = useState<CatalogItem[]>(INITIAL_ITEMS);
  const [alerts, setAlerts] = useState<AlertRule[]>(INITIAL_ALERTS);
  const [silences, setSilences] = useState<AlertSilence[]>([
    {
      id: 'silence-001',
      matchers: [{ name: 'alertname', value: 'FusionDatabaseConnectionPoolNearLimit' }],
      startsAt: new Date(Date.now() - 3600000).toISOString(),
      endsAt: new Date(Date.now() + 7200000).toISOString(),
      createdBy: 'sre-oncall@fusion.io',
      comment: 'Maintenance window for PgBouncer pool enlargement',
    },
  ]);

  // Telemetry state
  const [telemetryPoints, setTelemetryPoints] = useState<TimeSeriesPoint[]>([]);
  const [clusterStats, setClusterStats] = useState({
    rps: 420,
    latencyP95Ms: 18,
    errorRatePercent: 0.12,
    availability: '99.988',
    burnRate5m: '0.24',
  });

  // Chaos state
  const [chaosState, setChaosState] = useState<ChaosState>({
    activeProfile: 'normal',
    targetRps: 420,
    injectedLatencyMs: 18,
    injectedErrorRatePercent: 0.12,
    isSimulating: false,
  });

  const [isAutoRefreshing, setIsAutoRefreshing] = useState(true);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotificationMessage(msg);
    setTimeout(() => setNotificationMessage(null), 4000);
  };

  // Poll real-time telemetry from backend
  const fetchTelemetry = useCallback(async () => {
    try {
      const res = await fetch('/api/telemetry');
      if (res.ok) {
        const data = await res.json();
        setTelemetryPoints(data.series || []);
        if (data.currentStats) {
          setClusterStats(data.currentStats);
        }
      }
    } catch (e) {
      // fallback in case of local offline preview
      const now = Date.now();
      const newPoint: TimeSeriesPoint = {
        timestamp: new Date().toLocaleTimeString(),
        timestampMs: now,
        rps: clusterStats.rps,
        errorRate: clusterStats.errorRatePercent,
        latencyP95: clusterStats.latencyP95Ms,
        latencyP50: Math.round(clusterStats.latencyP95Ms * 0.45),
        availability: parseFloat(clusterStats.availability),
        burnRate5m: parseFloat(clusterStats.burnRate5m),
        burnRate1h: parseFloat(clusterStats.burnRate5m) * 0.8,
        cacheHitRatio: 91.2,
        dbConnections: 35,
      };
      setTelemetryPoints((prev) => [...prev.slice(-19), newPoint]);
    }
  }, [clusterStats]);

  // Load items from API
  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/items');
      if (res.ok) {
        const data = await res.json();
        if (data.items) {
          setItems(data.items);
        }
      }
    } catch (e) {
      console.warn('API items load fallback to initial state');
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
    fetchItems();
  }, []);

  // Periodic Telemetry Refresh
  useEffect(() => {
    if (!isAutoRefreshing) return;
    const interval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(interval);
  }, [isAutoRefreshing, fetchTelemetry]);

  // Update alert status dynamically based on current metrics
  useEffect(() => {
    setAlerts((prevAlerts) =>
      prevAlerts.map((alert) => {
        let isFiring = false;
        let currentValue = alert.currentValue;

        if (alert.name === 'FusionHighErrorRate') {
          isFiring = clusterStats.errorRatePercent > 5.0;
          currentValue = `${clusterStats.errorRatePercent}%`;
        } else if (alert.name === 'FusionHighLatencyP95') {
          isFiring = clusterStats.latencyP95Ms > 1000;
          currentValue = `${clusterStats.latencyP95Ms}ms`;
        } else if (alert.name === 'FusionSLOFastBurn') {
          isFiring = parseFloat(clusterStats.burnRate5m) >= 14.4;
          currentValue = `${clusterStats.burnRate5m}x`;
        } else if (alert.name === 'FusionSLOSlowBurn') {
          isFiring = parseFloat(clusterStats.burnRate5m) >= 6.0 && parseFloat(clusterStats.burnRate5m) < 14.4;
          currentValue = `${clusterStats.burnRate5m}x`;
        } else if (alert.name === 'FusionServiceDown') {
          isFiring = chaosState.activeProfile === 'pod-crash';
          currentValue = isFiring ? '0 (unhealthy)' : '1 (healthy)';
        }

        return {
          ...alert,
          status: isFiring ? 'firing' : 'resolved',
          currentValue,
        };
      })
    );
  }, [clusterStats, chaosState.activeProfile]);

  // Trigger Chaos or Load Simulation
  const handleTriggerChaos = async (profile: ChaosState['activeProfile']) => {
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });
      if (res.ok) {
        const data = await res.json();
        setChaosState((prev) => ({
          ...prev,
          activeProfile: profile,
          targetRps: data.simulatedRps,
          injectedLatencyMs: data.simulatedLatencyMs,
          injectedErrorRatePercent: data.simulatedErrorRatePercent,
        }));
        showToast(`Chaos Profile applied: ${profile.toUpperCase()}`);
        fetchTelemetry();
      }
    } catch (e) {
      showToast(`Chaos Profile: ${profile}`);
    }
  };

  // Scale service replicas
  const handleScaleService = (serviceId: string, delta: number) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.id !== serviceId) return s;
        const newCount = Math.max(s.minReplicas, Math.min(s.maxReplicas, s.pods.length + delta));
        const updatedPods = [...s.pods];

        if (delta > 0 && updatedPods.length < newCount) {
          const newPodId = `${s.name}-pod-${Math.random().toString(36).substring(2, 6)}`;
          updatedPods.push({
            id: newPodId,
            name: newPodId,
            node: `node-pool-${(updatedPods.length % 3) + 1}`,
            status: 'running',
            cpuUsage: Math.floor(20 + Math.random() * 25),
            memoryUsageMb: Math.floor(80 + Math.random() * 40),
            uptimeSeconds: 10,
            restartCount: 0,
          });
          showToast(`Scaled UP ${s.name} to ${updatedPods.length} replicas`);
        } else if (delta < 0 && updatedPods.length > newCount) {
          updatedPods.pop();
          showToast(`Scaled DOWN ${s.name} to ${updatedPods.length} replicas`);
        }

        return {
          ...s,
          replicas: updatedPods.length,
          pods: updatedPods,
        };
      })
    );
  };

  // Toggle Circuit Breaker
  const handleToggleCircuitBreaker = (serviceId: string) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.id !== serviceId) return s;
        const nextState = s.circuitBreakerState === 'closed' ? 'open' : 'closed';
        showToast(`${s.name} Circuit Breaker: ${nextState.toUpperCase()}`);
        return {
          ...s,
          circuitBreakerState: nextState,
        };
      })
    );
  };

  // Simulate killing a pod (Self-healing test)
  const handleKillPod = (serviceId: string, podId: string) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.id !== serviceId) return s;
        return {
          ...s,
          pods: s.pods.map((p) =>
            p.id === podId
              ? { ...p, status: 'terminating', restartCount: p.restartCount + 1 }
              : p
          ),
        };
      })
    );
    showToast(`Simulated pod crash: ${podId}. K8s restarting replica...`);

    // Auto-heal after 2 seconds
    setTimeout(() => {
      setServices((prev) =>
        prev.map((s) => {
          if (s.id !== serviceId) return s;
          return {
            ...s,
            pods: s.pods.map((p) =>
              p.id === podId ? { ...p, status: 'running', uptimeSeconds: 1 } : p
            ),
          };
        })
      );
      showToast(`Pod recovered: ${podId} is HEALTHY`);
    }, 2000);
  };

  // Add Item
  const handleAddItem = async (itemData: Partial<CatalogItem>) => {
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData),
      });
      if (res.ok) {
        const created = await res.json();
        setItems((prev) => [created, ...prev]);
        showToast(`Created Item: ${created.name} (Persisted to Postgres)`);
      }
    } catch (e) {
      showToast('Item created locally');
    }
  };

  // Delete Item
  const handleDeleteItem = async (id: number) => {
    try {
      await fetch(`/api/items/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((i) => i.id !== id));
      showToast(`Deleted Item #${id}`);
    } catch (e) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  // Purge Cache
  const handlePurgeCache = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        cached: false,
        dbLatencyMs: parseFloat((6.5 + Math.random() * 4).toFixed(1)),
      }))
    );
    showToast('Purged Redis LRU Cache. Next requests will query Postgres directly.');
  };

  // Silence alert
  const handleSilenceAlert = (alertName: string, durationMinutes: number) => {
    const newSilence: AlertSilence = {
      id: `silence-${Date.now().toString(36)}`,
      matchers: [{ name: 'alertname', value: alertName }],
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + durationMinutes * 60000).toISOString(),
      createdBy: 'operator@fusion.io',
      comment: `Silenced for ${durationMinutes} minutes via Alertmanager UI`,
    };
    setSilences((prev) => [newSilence, ...prev]);
    showToast(`Silenced ${alertName} for ${durationMinutes}m across Alertmanager mesh`);
  };

  const firingAlertsCount = alerts.filter((a) => a.status === 'firing').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Toast Notification */}
      {notificationMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-cyan-500/50 text-cyan-300 px-4 py-2.5 rounded-xl shadow-2xl font-mono text-xs flex items-center animate-bounce">
          <span className="w-2 h-2 rounded-full bg-cyan-400 mr-2"></span>
          {notificationMessage}
        </div>
      )}

      {/* Global Header & Nav */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        clusterStats={clusterStats}
        chaosState={chaosState}
        onTriggerChaos={handleTriggerChaos}
        firingAlertsCount={firingAlertsCount}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'topology' && (
          <TopologyView
            services={services}
            onScaleService={handleScaleService}
            onToggleCircuitBreaker={handleToggleCircuitBreaker}
            onKillPod={handleKillPod}
          />
        )}

        {activeTab === 'grafana' && (
          <GrafanaDashboard
            telemetryPoints={telemetryPoints}
            currentStats={clusterStats}
            onRefresh={fetchTelemetry}
            isAutoRefreshing={isAutoRefreshing}
            onToggleAutoRefresh={() => setIsAutoRefreshing(!isAutoRefreshing)}
          />
        )}

        {activeTab === 'prometheus' && (
          <PrometheusExplorer currentStats={clusterStats} />
        )}

        {activeTab === 'alerts' && (
          <AlertsConsole
            alerts={alerts}
            onSilenceAlert={handleSilenceAlert}
            silences={silences}
          />
        )}

        {activeTab === 'catalog' && (
          <CatalogManager
            items={items}
            onAddItem={handleAddItem}
            onDeleteItem={handleDeleteItem}
            onPurgeCache={handlePurgeCache}
            isLoading={false}
          />
        )}

        {activeTab === 'docs' && <ArchitectureDocs />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500 font-mono">
        Fusion Observability &amp; Microservices Architecture • Prometheus v2.55 • Grafana 11 • Alertmanager Mesh • Port 3000
      </footer>
    </div>
  );
}
