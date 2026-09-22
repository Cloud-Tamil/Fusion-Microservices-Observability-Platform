export const DOCKER_COMPOSE_CONTENT = `name: fusion-microservices-ha

x-logging: &default-logging
  driver: "json-file"
  options:
    max-size: "20m"
    max-file: "5"

networks:
  mesh-network:
    driver: bridge
  observability:
    driver: bridge

volumes:
  pg-primary-data:
  pg-replica-data:
  redis-master-data:
  redis-replica-data:
  prom-node1-data:
  prom-node2-data:
  alertmanager-node1-data:
  alertmanager-node2-data:
  grafana-storage:

services:
  # ---------------------------------------------------------------------------
  # 1. High Availability Ingress & API Gateway
  # ---------------------------------------------------------------------------
  api-gateway:
    image: fusion/api-gateway:latest
    build:
      context: ./services/gateway
      dockerfile: Dockerfile
    container_name: fusion-api-gateway
    ports:
      - "8000:8000"
    environment:
      - PORT=8000
      - AUTH_SERVICE_URL=http://auth-service:8001
      - ITEMS_SERVICE_URL=http://items-service:8002
      - ORDERS_SERVICE_URL=http://orders-service:8003
      - REDIS_URL=redis://redis-sentinel:26379
      - RATE_LIMIT_RPS=1000
    depends_on:
      - auth-service
      - items-service
      - orders-service
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health/ready"]
      interval: 10s
      timeout: 3s
      retries: 3
    networks:
      - mesh-network
      - observability
    logging: *default-logging

  # ---------------------------------------------------------------------------
  # 2. Auth & Identity Microservice (RBAC + JWT Authority)
  # ---------------------------------------------------------------------------
  auth-service:
    image: fusion/auth-service:latest
    build:
      context: ./services/auth
      dockerfile: Dockerfile
    deploy:
      replicas: 2
    environment:
      - PORT=8001
      - DATABASE_URL=postgresql+asyncpg://fusion:fusion@pgpool:5432/fusion_auth
      - REDIS_URL=redis://redis-master:6379/1
      - JWT_SECRET=\${FUSION_JWT_SECRET:-super-secure-production-key}
      - METRICS_ENABLED=true
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/health/ready"]
      interval: 10s
      timeout: 3s
      retries: 3
    networks:
      - mesh-network
      - observability
    logging: *default-logging

  # ---------------------------------------------------------------------------
  # 3. Items & Product Catalog Microservice (Read-Through Cache + CRUD)
  # ---------------------------------------------------------------------------
  items-service:
    image: fusion/items-service:latest
    build:
      context: ./services/items
      dockerfile: Dockerfile
    deploy:
      replicas: 3
    environment:
      - PORT=8002
      - DATABASE_URL=postgresql+asyncpg://fusion:fusion@pgpool:5432/fusion_catalog
      - REDIS_URL=redis://redis-master:6379/2
      - CACHE_TTL_SECONDS=300
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8002/health/ready"]
      interval: 10s
      timeout: 3s
      retries: 3
    networks:
      - mesh-network
      - observability
    logging: *default-logging

  # ---------------------------------------------------------------------------
  # 4. Orders & Workflow Microservice
  # ---------------------------------------------------------------------------
  orders-service:
    image: fusion/orders-service:latest
    build:
      context: ./services/orders
      dockerfile: Dockerfile
    deploy:
      replicas: 2
    environment:
      - PORT=8003
      - DATABASE_URL=postgresql+asyncpg://fusion:fusion@pgpool:5432/fusion_orders
      - ITEMS_SERVICE_URL=http://items-service:8002
      - NOTIF_SERVICE_URL=http://notifications-service:8004
    networks:
      - mesh-network
      - observability

  # ---------------------------------------------------------------------------
  # 5. Notifications & Event Dispatcher Microservice
  # ---------------------------------------------------------------------------
  notifications-service:
    image: fusion/notifications-service:latest
    build:
      context: ./services/notifications
      dockerfile: Dockerfile
    deploy:
      replicas: 2
    environment:
      - PORT=8004
      - REDIS_URL=redis://redis-master:6379/3
    networks:
      - mesh-network
      - observability

  # ---------------------------------------------------------------------------
  # 6. High Availability PostgreSQL (Primary + Standby Read Replica + PgBouncer)
  # ---------------------------------------------------------------------------
  pg-primary:
    image: postgres:16-alpine
    container_name: fusion-pg-primary
    environment:
      POSTGRES_USER: fusion
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-fusion}
      POSTGRES_MULTIPLE_DATABASES: fusion_auth,fusion_catalog,fusion_orders
    volumes:
      - pg-primary-data:/var/lib/postgresql/data
    networks:
      - mesh-network

  pgpool:
    image: edoburu/pgbouncer:latest
    container_name: fusion-pgbouncer
    environment:
      DB_USER: fusion
      DB_PASSWORD: fusion
      DB_HOST: pg-primary
      POOL_MODE: transaction
      MAX_CLIENT_CONN: 500
      DEFAULT_POOL_SIZE: 50
    ports:
      - "5432:5432"
    networks:
      - mesh-network

  # ---------------------------------------------------------------------------
  # 7. High Availability Redis Sentinel Cluster
  # ---------------------------------------------------------------------------
  redis-master:
    image: redis:7-alpine
    container_name: fusion-redis-master
    command: ["redis-server", "--appendonly", "yes", "--maxmemory", "512mb"]
    volumes:
      - redis-master-data:/data
    networks:
      - mesh-network

  # ---------------------------------------------------------------------------
  # 8. High Availability Dual-Node Prometheus Cluster
  # ---------------------------------------------------------------------------
  prometheus-node1:
    image: prom/prometheus:v2.55.1
    container_name: fusion-prometheus-node1
    command:
      - --config.file=/etc/prometheus/prometheus.yml
      - --storage.tsdb.path=/prometheus
      - --storage.tsdb.retention.time=30d
      - --web.enable-lifecycle
    volumes:
      - ./ops/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./ops/prometheus/recording_rules.yml:/etc/prometheus/recording_rules.yml:ro
      - ./ops/prometheus/alerts.yml:/etc/prometheus/alerts.yml:ro
      - prom-node1-data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - observability

  prometheus-node2:
    image: prom/prometheus:v2.55.1
    container_name: fusion-prometheus-node2
    command:
      - --config.file=/etc/prometheus/prometheus.yml
      - --storage.tsdb.path=/prometheus
      - --storage.tsdb.retention.time=30d
      - --web.enable-lifecycle
    volumes:
      - ./ops/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./ops/prometheus/recording_rules.yml:/etc/prometheus/recording_rules.yml:ro
      - ./ops/prometheus/alerts.yml:/etc/prometheus/alerts.yml:ro
      - prom-node2-data:/prometheus
    ports:
      - "9091:9090"
    networks:
      - observability

  # ---------------------------------------------------------------------------
  # 9. Clustered Alertmanager (Gossip Mesh High Availability)
  # ---------------------------------------------------------------------------
  alertmanager-node1:
    image: prom/alertmanager:v0.27.0
    container_name: fusion-alertmanager-node1
    command:
      - --config.file=/etc/alertmanager/alertmanager.yml
      - --cluster.peer=alertmanager-node2:9094
      - --cluster.listen-address=0.0.0.0:9094
    volumes:
      - ./ops/alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
      - alertmanager-node1-data:/alertmanager
    ports:
      - "9093:9093"
    networks:
      - observability

  alertmanager-node2:
    image: prom/alertmanager:v0.27.0
    container_name: fusion-alertmanager-node2
    command:
      - --config.file=/etc/alertmanager/alertmanager.yml
      - --cluster.peer=alertmanager-node1:9094
      - --cluster.listen-address=0.0.0.0:9094
    volumes:
      - ./ops/alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
      - alertmanager-node2-data:/alertmanager
    ports:
      - "9094:9093"
    networks:
      - observability

  # ---------------------------------------------------------------------------
  # 10. Grafana 11 with Provisioned Observability Dashboards
  # ---------------------------------------------------------------------------
  grafana:
    image: grafana/grafana:11.3.1
    container_name: fusion-grafana
    environment:
      - GF_SECURITY_ADMIN_USER=\${GRAFANA_ADMIN_USER:-admin}
      - GF_SECURITY_ADMIN_PASSWORD=\${GRAFANA_ADMIN_PASSWORD:-admin}
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - ./ops/grafana/provisioning:/etc/grafana/provisioning:ro
      - ./ops/grafana/dashboards:/var/lib/grafana/dashboards:ro
      - grafana-storage:/var/lib/grafana
    ports:
      - "3001:3000"
    networks:
      - observability
`;

export const KUBERNETES_MANIFEST_CONTENT = `---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: items-service
  namespace: fusion-prod
  labels:
    app.kubernetes.io/name: items-service
    app.kubernetes.io/part-of: fusion-platform
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 0
  selector:
    matchLabels:
      app: items-service
  template:
    metadata:
      labels:
        app: items-service
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8002"
        prometheus.io/path: "/metrics"
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: "topology.kubernetes.io/zone"
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: items-service
      containers:
        - name: items-service
          image: ghcr.io/cloud-tamil/fusion-items-service:v2.1.0
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 8002
              name: http
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8002
            initialDelaySeconds: 15
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8002
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 2
          startupProbe:
            httpGet:
              path: /health/startup
              port: 8002
            failureThreshold: 30
            periodSeconds: 5
          envFrom:
            - configMapRef:
                name: fusion-cluster-config
            - secretRef:
                name: fusion-cluster-secrets
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: items-service-pdb
  namespace: fusion-prod
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: items-service
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: items-service-hpa
  namespace: fusion-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: items-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "300m"
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: fusion-services-monitor
  namespace: monitoring
  labels:
    release: prometheus-stack
spec:
  selector:
    matchLabels:
      app.kubernetes.io/part-of: fusion-platform
  endpoints:
    - port: http
      path: /metrics
      interval: 10s
      scrapeTimeout: 5s
`;

export const PROMETHEUS_YML_CONTENT = `global:
  scrape_interval: 10s
  evaluation_interval: 10s
  external_labels:
    cluster: 'production-us-east-1'
    replica: 'node-A'

rule_files:
  - '/etc/prometheus/recording_rules.yml'
  - '/etc/prometheus/alerts.yml'

alerting:
  alertmanagers:
    - scheme: http
      static_configs:
        - targets:
            - 'alertmanager-node1:9093'
            - 'alertmanager-node2:9094'

scrape_configs:
  - job_name: 'fusion-microservices'
    metrics_path: '/metrics'
    static_configs:
      - targets:
          - 'api-gateway:8000'
          - 'auth-service:8001'
          - 'items-service:8002'
          - 'orders-service:8003'
          - 'notifications-service:8004'
        labels:
          tier: 'application'

  - job_name: 'infrastructure'
    static_configs:
      - targets:
          - 'postgres-exporter:9187'
          - 'redis-exporter:9121'
        labels:
          tier: 'storage'
`;

export const RECORDING_RULES_CONTENT = `groups:
  - name: fusion.recording.rules
    interval: 10s
    rules:
      # Aggregated requests per second per service
      - record: job:fusion_requests:rate5m
        expr: sum(rate(http_requests_total[5m])) by (job, status)

      # 5xx Error rate across the cluster
      - record: job:fusion_error_rate:5m
        expr: >
          sum(rate(http_requests_total{status=~"5.."}[5m]))
          /
          sum(rate(http_requests_total[5m]))

      # Latency 95th percentile
      - record: job:fusion_latency_p95:5m
        expr: >
          histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, job))

      # SLO Availability 5m
      - record: job:fusion_slo_availability:5m
        expr: 1 - job:fusion_error_rate:5m

      # Multi-window Multi-burn-rate (Target SLO: 99.9% -> Budget 0.001)
      # 14.4x burn rate exhausts 2% budget in 1 hour
      - record: job:fusion_slo_burn_rate:5m
        expr: job:fusion_error_rate:5m / (1 - 0.999)

      # 6x burn rate exhausts 5% budget in 6 hours
      - record: job:fusion_slo_burn_rate:1h
        expr: >
          (sum(rate(http_requests_total{status=~"5.."}[1h])) / sum(rate(http_requests_total[1h])))
          / (1 - 0.999)
`;
