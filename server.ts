import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory simulation state
interface ItemState {
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

let items: ItemState[] = [
  { id: 1, name: 'Titan Pro Compute Engine v3', description: 'High-availability cloud server unit with redundant power rails.', category: 'Compute', price: 499.00, stock: 142, sku: 'FUS-COMP-01', cached: true, dbLatencyMs: 4.2, correlationId: 'req-8f72a1b9', updatedAt: new Date().toISOString() },
  { id: 2, name: 'HyperPulse Redis NVMe Accelerator', description: 'Sub-millisecond persistent memory tier for distributed state caches.', category: 'Storage', price: 1250.00, stock: 35, sku: 'FUS-STOR-99', cached: true, dbLatencyMs: 3.8, correlationId: 'req-9c41b802', updatedAt: new Date().toISOString() },
  { id: 3, name: 'QuantumMesh 100GbE SDN Gateway', description: 'Zero-loss packet inspection router with hardware rate-limiting ASIC.', category: 'Networking', price: 3400.00, stock: 18, sku: 'FUS-NET-40', cached: false, dbLatencyMs: 7.6, correlationId: 'req-12a884cd', updatedAt: new Date().toISOString() },
  { id: 4, name: 'Aegis HSM Crypto Security Module', description: 'FIPS 140-3 Level 4 hardware security token signer for JWT authority.', category: 'Security', price: 2150.00, stock: 24, sku: 'FUS-SEC-07', cached: true, dbLatencyMs: 5.1, correlationId: 'req-3b99ff10', updatedAt: new Date().toISOString() },
  { id: 5, name: 'Sentry Telemetry Node Agent', description: 'Edge daemon collecting kernel eBPF performance traces and OpenTelemetry spans.', category: 'Monitoring', price: 320.00, stock: 89, sku: 'FUS-OBS-15', cached: true, dbLatencyMs: 4.0, correlationId: 'req-44e21a08', updatedAt: new Date().toISOString() },
];

let nextItemId = 6;

// Dynamic simulation parameters
let simulatedRps = 420;
let simulatedLatencyMs = 18;
let simulatedErrorRatePercent = 0.12;
let activeProfile: 'normal' | 'high-load' | 'latency-spike' | 'error-surge' | 'pod-crash' = 'normal';
let profileExpiresAt: number = 0;

// Prometheus metrics accumulators
let totalRequests = 1584200;
let totalErrors = 1890;
let cacheHits = 892000;
let cacheMisses = 142000;

// Reset profiles after 45 seconds if temporary
function checkProfileExpiry() {
  if (profileExpiresAt > 0 && Date.now() > profileExpiresAt) {
    activeProfile = 'normal';
    simulatedRps = 420;
    simulatedLatencyMs = 18;
    simulatedErrorRatePercent = 0.12;
    profileExpiresAt = 0;
  }
}

// ----------------------------------------------------------------------------
// Health Probes (Kubernetes Liveness, Readiness, Startup)
// ----------------------------------------------------------------------------
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'live', timestamp: new Date().toISOString() });
});

app.get('/health/ready', (req, res) => {
  checkProfileExpiry();
  if (activeProfile === 'pod-crash') {
    res.status(503).json({ status: 'unready', reason: 'dependency_health_check_failed', code: 503 });
    return;
  }
  res.status(200).json({ status: 'ready', postgres: 'connected', redis: 'connected', activeReplicas: 3 });
});

app.get('/health/startup', (req, res) => {
  res.status(200).json({ status: 'initialized', tablesCreated: true, cacheWarmed: true });
});

// ----------------------------------------------------------------------------
// Prometheus Scrape Endpoint (/metrics)
// Standard OpenMetrics / Prometheus exposition format
// ----------------------------------------------------------------------------
app.get('/metrics', (req, res) => {
  checkProfileExpiry();
  const now = Date.now();
  totalRequests += Math.floor(simulatedRps * 0.5);
  if (simulatedErrorRatePercent > 0.5) {
    totalErrors += Math.floor(simulatedRps * (simulatedErrorRatePercent / 100) * 0.5);
  }

  const availability = Math.max(0.90, 1 - (simulatedErrorRatePercent / 100));
  const burnRate5m = (simulatedErrorRatePercent / 100) / (1 - 0.999);
  const burnRate1h = (simulatedErrorRatePercent / 100 * 0.8) / (1 - 0.999);

  const metricsOutput = `
# HELP http_requests_total Total number of HTTP requests processed
# TYPE http_requests_total counter
http_requests_total{job="api-gateway",status="200"} ${totalRequests - totalErrors}
http_requests_total{job="api-gateway",status="500"} ${totalErrors}
http_requests_total{job="items-service",status="200"} ${Math.floor(totalRequests * 0.6)}
http_requests_total{job="auth-service",status="200"} ${Math.floor(totalRequests * 0.25)}

# HELP http_request_duration_seconds Request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.005",job="api-gateway"} ${Math.floor(totalRequests * 0.2)}
http_request_duration_seconds_bucket{le="0.01",job="api-gateway"} ${Math.floor(totalRequests * 0.5)}
http_request_duration_seconds_bucket{le="0.025",job="api-gateway"} ${Math.floor(totalRequests * 0.8)}
http_request_duration_seconds_bucket{le="0.05",job="api-gateway"} ${Math.floor(totalRequests * 0.95)}
http_request_duration_seconds_bucket{le="0.1",job="api-gateway"} ${Math.floor(totalRequests * 0.98)}
http_request_duration_seconds_bucket{le="+Inf",job="api-gateway"} ${totalRequests}
http_request_duration_seconds_sum{job="api-gateway"} ${(totalRequests * (simulatedLatencyMs / 1000)).toFixed(3)}
http_request_duration_seconds_count{job="api-gateway"} ${totalRequests}

# HELP fusion_active_connections Current active HTTP connections
# TYPE fusion_active_connections gauge
fusion_active_connections{service="api-gateway"} ${Math.floor(simulatedRps * 0.2)}
fusion_active_connections{service="items-service"} ${Math.floor(simulatedRps * 0.12)}

# HELP fusion_db_pool_utilization Database connection pool utilization ratio
# TYPE fusion_db_pool_utilization gauge
fusion_db_pool_utilization ${activeProfile === 'high-load' ? '0.88' : '0.34'}

# HELP fusion_cache_hits_total Total Redis cache hits
# TYPE fusion_cache_hits_total counter
fusion_cache_hits_total ${cacheHits}

# HELP fusion_cache_misses_total Total Redis cache misses
# TYPE fusion_cache_misses_total counter
fusion_cache_misses_total ${cacheMisses}

# HELP job:fusion_error_rate:5m 5-minute rolling error rate
# TYPE job:fusion_error_rate:5m gauge
job:fusion_error_rate:5m ${(simulatedErrorRatePercent / 100).toFixed(5)}

# HELP job:fusion_latency_p95:5m 95th percentile latency in seconds
# TYPE job:fusion_latency_p95:5m gauge
job:fusion_latency_p95:5m ${(simulatedLatencyMs / 1000).toFixed(4)}

# HELP job:fusion_slo_availability:5m Current 5-minute availability ratio
# TYPE job:fusion_slo_availability:5m gauge
job:fusion_slo_availability:5m ${availability.toFixed(5)}

# HELP job:fusion_slo_burn_rate:5m 5-minute SLO burn rate factor
# TYPE job:fusion_slo_burn_rate:5m gauge
job:fusion_slo_burn_rate:5m ${burnRate5m.toFixed(2)}

# HELP job:fusion_slo_burn_rate:1h 1-hour SLO burn rate factor
# TYPE job:fusion_slo_burn_rate:1h gauge
job:fusion_slo_burn_rate:1h ${burnRate1h.toFixed(2)}
`.trim();

  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(metricsOutput);
});

// ----------------------------------------------------------------------------
// API: Telemetry Time-Series for UI Charts
// ----------------------------------------------------------------------------
app.get('/api/telemetry', (req, res) => {
  checkProfileExpiry();
  const points = [];
  const now = Date.now();
  const count = 20;

  for (let i = count - 1; i >= 0; i--) {
    const t = now - (i * 10000);
    const dateObj = new Date(t);
    const timeLabel = `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}:${dateObj.getSeconds().toString().padStart(2, '0')}`;
    
    // Add jitter
    const noise = Math.sin(i * 0.8) * 20;
    const currentRps = Math.max(50, simulatedRps + noise);
    const currentLatency = Math.max(4, simulatedLatencyMs + (Math.cos(i) * 3));
    const currentError = Math.max(0, simulatedErrorRatePercent + (i === 0 ? 0 : (Math.random() * 0.05 - 0.02)));
    const availability = Math.max(90, 100 - currentError);
    const burnRate = currentError / 0.1; // 0.1% is 99.9% target budget

    points.push({
      timestamp: timeLabel,
      timestampMs: t,
      rps: Math.round(currentRps),
      errorRate: parseFloat(currentError.toFixed(2)),
      latencyP95: parseFloat(currentLatency.toFixed(1)),
      latencyP50: parseFloat((currentLatency * 0.45).toFixed(1)),
      availability: parseFloat(availability.toFixed(3)),
      burnRate5m: parseFloat(burnRate.toFixed(2)),
      burnRate1h: parseFloat((burnRate * 0.8).toFixed(2)),
      cacheHitRatio: activeProfile === 'high-load' ? 94.2 : 88.5,
      dbConnections: activeProfile === 'high-load' ? 78 : 34,
    });
  }

  res.json({
    activeProfile,
    currentStats: {
      rps: simulatedRps,
      latencyP95Ms: simulatedLatencyMs,
      errorRatePercent: simulatedErrorRatePercent,
      availability: Math.max(90, 100 - simulatedErrorRatePercent).toFixed(3),
      burnRate5m: ((simulatedErrorRatePercent / 100) / 0.001).toFixed(2),
    },
    series: points,
  });
});

// ----------------------------------------------------------------------------
// API: Items Catalog CRUD (with Redis cache & trace simulation)
// ----------------------------------------------------------------------------
app.get('/api/items', (req, res) => {
  const correlationId = (req.headers['x-correlation-id'] as string) || `req-${Math.random().toString(16).substring(2, 10)}`;
  res.setHeader('X-Correlation-ID', correlationId);
  res.json({ items, correlationId });
});

app.post('/api/items', (req, res) => {
  const { name, description, category, price, stock, sku } = req.body;
  if (!name || price === undefined) {
    res.status(400).json({ error: 'Name and price are required.' });
    return;
  }
  const correlationId = `req-${Math.random().toString(16).substring(2, 10)}`;
  const newItem: ItemState = {
    id: nextItemId++,
    name,
    description: description || '',
    category: category || 'General',
    price: Number(price),
    stock: Number(stock) || 10,
    sku: sku || `FUS-${Math.floor(1000 + Math.random() * 9000)}`,
    cached: false, // Write directly to Postgres, cache invalidated
    dbLatencyMs: parseFloat((3.5 + Math.random() * 4).toFixed(1)),
    correlationId,
    updatedAt: new Date().toISOString(),
  };
  items.unshift(newItem);
  res.status(201).json(newItem);
});

app.delete('/api/items/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  items = items.filter(item => item.id !== id);
  res.status(200).json({ success: true, id });
});

// ----------------------------------------------------------------------------
// API: Chaos & Load Simulator
// ----------------------------------------------------------------------------
app.post('/api/simulate', (req, res) => {
  const { profile } = req.body;
  activeProfile = profile;
  profileExpiresAt = Date.now() + 60000; // auto-revert after 60s

  switch (profile) {
    case 'high-load':
      simulatedRps = 1850;
      simulatedLatencyMs = 45;
      simulatedErrorRatePercent = 0.8;
      break;
    case 'latency-spike':
      simulatedRps = 380;
      simulatedLatencyMs = 1450; // Trigger p95 > 1s alert!
      simulatedErrorRatePercent = 0.4;
      break;
    case 'error-surge':
      simulatedRps = 520;
      simulatedLatencyMs = 28;
      simulatedErrorRatePercent = 8.5; // Trigger > 5% error rate alert!
      break;
    case 'pod-crash':
      simulatedRps = 120;
      simulatedLatencyMs = 85;
      simulatedErrorRatePercent = 22.0; // Trigger service down / SLO fast burn!
      break;
    case 'normal':
    default:
      activeProfile = 'normal';
      simulatedRps = 420;
      simulatedLatencyMs = 18;
      simulatedErrorRatePercent = 0.12;
      profileExpiresAt = 0;
      break;
  }

  res.json({
    message: `Applied simulation profile: ${activeProfile}`,
    activeProfile,
    simulatedRps,
    simulatedLatencyMs,
    simulatedErrorRatePercent,
  });
});

// ----------------------------------------------------------------------------
// Server Initialization & Vite Integration
// ----------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Fusion Microservices Platform running on http://0.0.0.0:${PORT}`);
    console.log(`Prometheus metrics available at http://0.0.0.0:${PORT}/metrics`);
    console.log(`Kubernetes readiness probe at http://0.0.0.0:${PORT}/health/ready`);
  });
}

startServer();
