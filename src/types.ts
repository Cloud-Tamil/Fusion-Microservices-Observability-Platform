export type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy' | 'scaling';

export interface PodReplica {
  id: string;
  name: string;
  node: string;
  status: 'running' | 'terminating' | 'starting' | 'crashed';
  cpuUsage: number; // percentage
  memoryUsageMb: number;
  uptimeSeconds: number;
  restartCount: number;
}

export interface MicroserviceNode {
  id: string;
  name: string;
  role: string;
  category: 'gateway' | 'core' | 'storage' | 'observability';
  port: number;
  replicas: number;
  minReplicas: number;
  maxReplicas: number;
  pods: PodReplica[];
  status: ServiceStatus;
  rps: number;
  latencyP95Ms: number;
  errorRatePercent: number;
  circuitBreakerState: 'closed' | 'open' | 'half-open';
  dependencies: string[];
  description: string;
  techStack: string;
}

export interface CatalogItem {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  sku: string;
  cached: boolean;
  dbLatencyMs: number;
  correlationId: string;
  updatedAt: string;
}

export interface TimeSeriesPoint {
  timestamp: string;
  timestampMs: number;
  rps: number;
  errorRate: number;
  latencyP95: number;
  latencyP50: number;
  availability: number;
  burnRate5m: number;
  burnRate1h: number;
  cacheHitRatio: number;
  dbConnections: number;
}

export interface AlertRule {
  name: string;
  expr: string;
  duration: string;
  severity: 'critical' | 'warning' | 'info';
  team: string;
  slo?: string;
  summary: string;
  description: string;
  status: 'firing' | 'pending' | 'resolved';
  currentValue: string;
  threshold: string;
  lastTriggered?: string;
}

export interface AlertSilence {
  id: string;
  matchers: { name: string; value: string }[];
  startsAt: string;
  endsAt: string;
  createdBy: string;
  comment: string;
}

export interface PrometheusTarget {
  job: string;
  instance: string;
  health: 'up' | 'down';
  scrapeInterval: string;
  lastScrape: string;
  scrapeDurationMs: number;
  metricsPath: string;
}

export interface ChaosState {
  activeProfile: 'normal' | 'high-load' | 'latency-spike' | 'error-surge' | 'pod-crash';
  targetRps: number;
  injectedLatencyMs: number;
  injectedErrorRatePercent: number;
  podKillTarget?: string;
  isSimulating: boolean;
}
