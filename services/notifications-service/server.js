const express = require('express');
const client = require('prom-client');

const app = express();
const PORT = 8004;

app.use(express.json());

// Enable CORS for web console and local testing
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Correlation-ID');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Prometheus Metrics Registry
const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'fusion_' });

const NOTIFICATIONS_SENT = new client.Counter({
  name: 'fusion_notifications_sent_total',
  help: 'Total notifications and webhooks successfully dispatched',
  labelNames: ['channel', 'status'],
  registers: [register]
});

const QUEUE_DEPTH = new client.Gauge({
  name: 'fusion_notification_queue_depth',
  help: 'Current pending messages awaiting delivery in event buffer',
  registers: [register]
});

QUEUE_DEPTH.set(0);

// Health Endpoints
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive', service: 'notifications-service' });
});

app.get('/health/ready', (req, res) => {
  res.json({ status: 'ready', mq: 'connected', smtp_pool: 'idle' });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Dispatch Notification Endpoint
app.post('/notifications/dispatch', (req, res) => {
  const { channel, recipient, message } = req.body;
  if (!channel || !recipient) {
    return res.status(400).json({ error: 'channel and recipient required' });
  }

  // Simulate notification processing
  NOTIFICATIONS_SENT.inc({ channel, status: 'delivered' });
  res.json({
    dispatched: true,
    channel,
    recipient,
    delivery_timestamp: new Date().toISOString()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Fusion Notifications Service running on port ${PORT}`);
});
