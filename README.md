# Fusion Microservices & Observability Platform (v2.5)

An enterprise-grade, high-availability microservices ecosystem refactored from a monolithic application into resilient domain services. Built with automated CI/CD, Kubernetes auto-scaling (HPA), zero-single-point-of-failure (Zero-SPOF) data tiers, and full-stack observability powered by Prometheus, Grafana 11, and a dual-node Alertmanager mesh.

---

## 🌟 What This Application Has: Complete Inventory of Features & Artifacts

This repository is an end-to-end, production-ready Cloud Native & SRE platform containing runnable microservices, complete Kubernetes & Helm configurations, CI/CD pipelines, Prometheus/Grafana observability suites, and an interactive Cloud Operations Web Console.

### 1. Interactive Web Operations & Observability Console (React 19 + Vite)
Located in `/src/`, this modern web console provides a live visual interface to monitor, test, and operate the platform:
- **Interactive Service Mesh & Topology Map (`TopologyView`)**:
  - Visual node graph displaying 10 connected components (Ingress, API Gateway, 5 Microservices, PostgreSQL, Redis, PgBouncer).
  - Real-time node throughput (RPS), p95 latency, and error rate metrics with animated status rings (Healthy / Degraded / Outage).
  - **Self-Healing Chaos Injection**: Interactive "Kill Pod" button on any microservice node to simulate pod crashes and observe Kubernetes self-healing.
  - **Circuit Breaker Controls**: Toggle circuit breakers per microservice to simulate automated downstream isolation during cascading failures.
  - **Dynamic Pod Scaling**: Interactive slider and controls to scale replicas between 1 and 10 with live topology updates.
- **SRE Grafana 11 Dashboard Suite (`GrafanaDashboard`)**:
  - **99.9% Availability SLO Widget**: Real-time 5-minute rolling availability percentage with compliance status tags.
  - **SLO Multi-Window Burn Rate Gauge**: Live visualization of 5-minute fast burn rate ($14.4\times$ budget loss) and 1-hour slow burn rate ($6.0\times$).
  - **Google SRE Golden Signals (RED)**:
    - *Rate*: Total HTTP request throughput (RPS).
    - *Errors*: HTTP 5xx error rate percentage.
    - *Duration*: 95th and 50th percentile response latencies (ms).
    - *Saturation*: PostgreSQL connection pool depth and active PgBouncer sessions.
- **Prometheus & PromQL Engine (`PrometheusExplorer`)**:
  - Interactive PromQL query bar with instant vector evaluations.
  - Quick-run templates for Availability SLO, Error Rate %, p95 Latency, and Burn Rates.
  - Scrape target health status grid showing all 7 scrape targets (`api-gateway`, `items-service`, `auth-service`, `orders-service`, `node-exporter`, `kube-state-metrics`, `alertmanager`).
  - Live raw `/metrics` text exposition viewer in OpenMetrics format.
- **Clustered Alertmanager Console (`AlertsConsole`)**:
  - High-availability dual-node gossip mesh status indicator (`:9093` & `:9094`).
  - Feed of 8 production alert rules (`FusionServiceDown`, `FusionHighErrorRate`, `FusionHighLatencyP95`, `FusionSLOFastBurn`, `FusionSLOSlowBurn`, etc.) with states (`Firing`, `Pending`, `Resolved`).
  - Active alert silence management with expiration tracking and silence creation.
- **Hardware Catalog & Cache Testing Store (`CatalogManager`)**:
  - Live hardware catalog demonstrating sub-millisecond Redis read-through cache hits (<1ms) vs. PostgreSQL cold queries (18–35ms).
  - Add and delete item operations with automatic cache invalidation.
  - Real-time audit log tracking request headers, response times, and `X-Correlation-ID` tracing tokens.
- **DevOps Architecture & Runbook Hub (`ArchitectureDocs`)**:
  - In-app searchable browser for all 30 production runbooks and interview defense modules.
  - 1-click copyable production manifests for `docker-compose.yml`, `k8s/base/items-service.yaml`, `.github/workflows/ci-cd.yml`, `helm/values.yaml`, `prometheus.yml`, and `recording_rules.yml`.
- **Traffic & Chaos Simulation Bar (`Header`)**:
  - Real-time traffic profiles: **Normal Traffic** (420 RPS), **Traffic Surge** (1,200 RPS), **5xx Error Injection** (simulates database deadlock), and **High Latency Degradation** (simulates disk I/O wait).
  - Perturbs metrics across the entire application in real time, allowing you to observe alerts firing and burn-rate dials changing live.

---

### 2. Microservice Runtimes & Container Implementation
Located in `/services/`, each microservice has independent application source code, dependency specifications, and optimized multi-stage Dockerfiles:
- **`api-gateway` (`:8000`)**:
  - Python 3.12 + FastAPI runtime.
  - In-memory token-bucket rate limiter (100 req/s burst limit).
  - Distributed tracing propagation injecting `X-Correlation-ID` on all inbound and outbound requests.
  - Native `/health/live`, `/health/ready`, and `/metrics` endpoints.
- **`auth-service` (`:8001`)**:
  - Python 3.12 + FastAPI + PyJWT + Cryptography.
  - Asymmetric RS256 JWT key authority.
  - Public JWKS endpoint (`/.well-known/jwks.json`) for zero-network token verification.
  - Redis session token blacklisting and RBAC validation.
- **`items-service` (`:8002`)**:
  - Python 3.12 + FastAPI + Redis + SQLAlchemy.
  - Sub-millisecond Redis read-through caching tier.
  - PostgreSQL writes with connection pooling via PgBouncer.
  - Custom Prometheus counters (`fusion_cache_hits_total`, `fusion_cache_misses_total`) and gauges (`fusion_items_count`).
- **`orders-service` (`:8003`)**:
  - Python 3.12 + FastAPI + Pydantic v2.
  - Distributed saga order checkout coordinator with item stock checks.
  - Idempotency key validation to prevent duplicate order charges during network retries.
  - Histogram instrumentation for checkout processing latency.
- **`notifications-service` (`:8004`)**:
  - Node.js 20 + Express + `prom-client`.
  - Asynchronous webhook and notification delivery engine with retry queues.
  - Prometheus default metrics collection and custom delivery counters.
- **Production Multi-Stage Dockerfiles**:
  - Multi-stage builds with builder and minimal runner layers (`python:3.12-slim`, `node:20-alpine`).
  - Dedicated non-root `fusion` user (`UID 10001`) for compliance with Kubernetes restricted pod security standards.
  - Native container `HEALTHCHECK` definitions.

---

### 3. Complete 10-Service Local Stack (`docker-compose.yml`)
Runs the complete platform locally with one command (`docker compose up -d --build`):
1. `api-gateway` (:8000)
2. `auth-service` (:8001)
3. `items-service` (:8002)
4. `orders-service` (:8003)
5. `notifications-service` (:8004)
6. `postgres` (:5432 - PostgreSQL 16 Alpine with persistent volume)
7. `redis` (:6379 - Redis 7.2 Alpine with healthcheck)
8. `prometheus` (:9090 - Prometheus v2.55 with `--web.enable-lifecycle`)
9. `alertmanager` (:9093 - Alertmanager v0.27)
10. `grafana` (:3001 - Grafana 11.3 with auto-provisioned datasources and dashboards)

---

### 4. Production Kubernetes & Helm Infrastructure as Code
- **`k8s/base/`**:
  - `namespace.yaml`: Restricted Pod Security Standard enforcement (`pod-security.kubernetes.io/enforce: restricted`).
  - `configmaps.yaml`: Centralized environment configurations.
  - `secrets.yaml`: Database credentials, JWT private keys, and webhook URLs.
  - `api-gateway.yaml`: Zero-downtime deployment (maxSurge 25%, maxUnavailable 0) with probes and resource limits.
  - `items-service.yaml`:
    - Deployment with `topologySpreadConstraints` across availability zones.
    - `HorizontalPodAutoscaler` (HPA) scaling between 3 and 10 replicas (70% CPU, 80% RAM).
    - `PodDisruptionBudget` (PDB) guaranteeing `minAvailable: 2`.
    - `ServiceMonitor` CRD for automated Prometheus Operator scraping.
  - `ingress.yaml`: NGINX Ingress rules, TLS secret bindings, CORS headers, and timeout configurations.
  - `network-policies.yaml`: Zero-trust network isolation (`default-deny-all`, gateway ingress/egress rules).
- **`k8s/overlays/`**:
  - `dev`: Scaled down for lightweight resource footprints (1 replica, 100m CPU).
  - `prod`: High-availability multi-zone configuration (3 replicas, strict PDB).
- **`helm/fusion-platform/`**:
  - Complete reusable Helm 3 chart with `Chart.yaml`, `values.yaml`, and modular templates (`deployment.yaml`, `service.yaml`, `ingress.yaml`, `hpa.yaml`, `servicemonitor.yaml`, `_helpers.tpl`).

---

### 5. Enterprise Observability & Multi-Window Alerting (`ops/`)
- **`ops/prometheus/prometheus.yml`**: Dual-node scrape configurations for all 5 microservices, `node-exporter`, and `kube-state-metrics`.
- **`ops/prometheus/recording_rules.yml`**: SRE recording rules computing 5m rolling availability SLOs, error rates, p95 latencies, and multi-window burn rates.
- **`ops/prometheus/alerts.yml`**: 8 production alert rules:
  1. `FusionServiceDown` (Instance unreachable >1m) — Critical
  2. `FusionHighErrorRate` (5xx rate > 5.0% for 2m) — Critical
  3. `FusionHighLatencyP95` (p95 latency > 1000ms for 3m) — Warning
  4. `FusionSLOFastBurn` (Burn rate > 14.4x consuming 2% budget in 1h) — Critical
  5. `FusionSLOSlowBurn` (Burn rate > 6.0x consuming 5% budget in 6h) — Warning
  6. `FusionHighCPUUsage` (Pod CPU > 85% for 5m) — Warning
  7. `FusionHighMemoryUsage` (Pod RAM > 90% for 5m) — Critical
  8. `FusionPodCrashLooping` (>3 container restarts in 10m) — Critical
- **`ops/alertmanager/alertmanager.yml`**: Clustered gossip mesh configuration (`:9094`), PagerDuty routing for critical alerts, and Slack routing for warning notifications.
- **`ops/grafana/`**: Automated datasource provisioning and `slo-overview.json` dashboard with Golden Signals panels.

---

### 6. Automated CI/CD Quality & Security Pipelines (`.github/workflows/`)
- **`ci-cd.yml`**:
  - Stage 1: Python flake8 and pytest unit testing.
  - Stage 2: Trivy CVE container and filesystem security vulnerability scan.
  - Stage 3: Multi-architecture Docker build and push to GitHub Container Registry (`ghcr.io`).
  - Stage 4: Kubernetes zero-downtime rolling update rollout verification.
- **`pr-lint.yml`**:
  - Code formatting checks (`black --check`, `isort --check-only`).
  - Kubernetes manifest validation via `kubeconform -strict` (v1.30 schema).
  - Helm chart validation via `helm lint` and `helm template --dry-run`.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [Architecture Diagram](#3-architecture-diagram)
4. [Microservices Explanation](#4-microservices-explanation)
5. [Technology Stack](#5-technology-stack)
6. [Repository/Folder Structure](#6-repositoryfolder-structure)
7. [Prerequisites](#7-prerequisites)
8. [Local Development Setup](#8-local-development-setup)
9. [Docker Build and Run Commands](#9-docker-build-and-run-commands)
10. [Docker Compose Commands](#10-docker-compose-commands)
11. [Kubernetes Deployment Commands](#11-kubernetes-deployment-commands)
12. [Kubernetes Troubleshooting Commands](#12-kubernetes-troubleshooting-commands)
13. [Prometheus Installation and Configuration](#13-prometheus-installation-and-configuration)
14. [Grafana Installation and Configuration](#14-grafana-installation-and-configuration)
15. [Grafana Dashboard Setup](#15-grafana-dashboard-setup)
16. [Alertmanager Configuration](#16-alertmanager-configuration)
17. [Monitoring and Observability Architecture](#17-monitoring-and-observability-architecture)
18. [CI/CD Pipeline Explanation](#18-cicd-pipeline-explanation)
19. [Deployment Procedure](#19-deployment-procedure)
20. [Rollback Procedure](#20-rollback-procedure)
21. [Scaling Commands](#21-scaling-commands)
22. [Logs and Troubleshooting Commands](#22-logs-and-troubleshooting-commands)
23. [Useful Docker Commands](#23-useful-docker-commands)
24. [Useful Kubernetes Commands](#24-useful-kubernetes-commands)
25. [Useful Helm Commands](#25-useful-helm-commands)
26. [Useful Prometheus Commands](#26-useful-prometheus-commands)
27. [Useful Grafana-Related Commands](#27-useful-grafana-related-commands)
28. [Application Testing Commands](#28-application-testing-commands)
29. [Health-Check Commands](#29-health-check-commands)
30. [Cleanup/Destroy Commands](#30-cleanupdestroy-commands)

---

## 1. Project Overview
The **Fusion Platform** was originally a monolithic FastAPI application containing mixed concerns: routing, authentication, catalog storage, and telemetry tightly coupled into a single runtime.

### What Was Refactored:
- **Monolith to Microservices**: Split into single-responsibility services (`API Gateway`, `Auth`, `Items Catalog`, `Orders`, `Notifications`).
- **Data Tier Decoupling**: Implemented PostgreSQL with PgBouncer connection multiplexing and Redis Sentinel LRU caching.
- **Production DevOps Lifecycle**: Containerized via multi-stage Docker builds, codified in Kubernetes with GitOps/Helm, and secured with least-privilege RBAC.
- **Enterprise Observability**: Dual-node Prometheus scrapers, multi-window SLO burn-rate alerts (>14.4x fast burn, >6.0x slow burn), clustered Alertmanager gossip mesh, and auto-provisioned Grafana 11 dashboards.
- **Modern Management Console**: Real-time React 19 UI with service mesh topology visualization, live PromQL query execution, and chaos load testing.

---

## 2. Architecture Overview
The platform follows a cloud-native, zero-trust microservices design:
- **Client Traffic Ingress**: Ingress NGINX receives external requests, performs SSL termination, and routes traffic to the API Gateway.
- **API Gateway (`:8000`)**: Enforces rate limiting, correlates distributed traces via `X-Correlation-ID` headers, validates JWTs, and routes traffic downstream via internal DNS (`*.fusion.svc.cluster.local`).
- **Resilience & Fault Tolerance**:
  - **Circuit Breaking**: Envoy/Gateway cut off cascading failures if downstream latency exceeds 1500ms.
  - **Pod Disruption Budgets (PDB)**: Guarantees `minAvailable: 2` during node drains or rolling upgrades.
  - **Horizontal Pod Autoscaling (HPA)**: Dynamically scales replicas between 3 and 10 based on 70% CPU utilization and 300 RPS target.
- **Telemetry Plane**:
  - Every microservice exports RED metrics (Rate, Errors, Duration) on `/metrics`.
  - Node Exporter and kube-state-metrics provide infrastructure telemetry.
  - Dual Prometheus instances scrape targets redundantly.
  - Clustered Alertmanager dedupes and routes notifications to PagerDuty and Slack.

---

## 3. Architecture Diagram

```
                              [ User / Client Browser ]
                                          │
                                          ▼
                             [ Ingress NGINX Controller ]
                                 (TLS / Port 443 / 80)
                                          │
                   ┌──────────────────────┴──────────────────────┐
                   │                                             │
                   ▼                                             ▼
       [ Web Management Console ]                       [ API Gateway :8000 ]
        (React 19 / Port 3000)                        (Rate Limiter / Trace ID)
                                                                 │
         ┌──────────────────┬──────────────────┬─────────────────┼──────────────────┐
         │                  │                  │                 │                  │
         ▼                  ▼                  ▼                 ▼                  ▼
  [ Auth Service ]   [ Items Service ]  [ Orders Service ] [ Notifications ] [ Future Svc ]
     Port 8001          Port 8002          Port 8003         Port 8004
   (RS256 JWT)       (Read-Through)     (Saga Checkout)   (Async Webhook)
         │                  │                  │                 │
         │                  ▼                  ▼                 │
         │          ┌───────────────┐   ┌──────────────┐         │
         │          │ Redis Sentinel│   │ PgBouncer    │         │
         │          │ (Cache Tier)  │   │ (Pooler)     │         │
         │          └───────┬───────┘   └──────┬───────┘         │
         │                  │                  │                 │
         └──────────────────┼──────────────────┘                 │
                            ▼                                    │
                 [ PostgreSQL 16 Primary ] ◀─────────────────────┘
                 (Read/Write Streaming Replication)
                            │
                            ▼
                 [ PostgreSQL 16 Replica ] (Read-Only)

═════════════════════════════════════════════════════════════════════════════════════
                              OBSERVABILITY PLANE
═════════════════════════════════════════════════════════════════════════════════════

   [ Microservices /metrics ]  [ kube-state-metrics ]  [ Node Exporters ]
                │                      │                       │
                └──────────────────────┼───────────────────────┘
                                       ▼
                       ┌───────────────────────────────┐
                       │  Dual-Node Prometheus Cluster │
                       │    (node-1:9090 / node-2:9090)│
                       └───────────────┬───────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
        [ Clustered Alertmanager ]               [ Grafana 11 Dashboards ]
       (node-1:9093 <-> node-2:9094)                 (Port 3001)
                    │                                     │
          ┌─────────┴─────────┐                  - SLO Availability (99.9%)
          ▼                   ▼                  - 5m & 1h Burn Rate
    [ PagerDuty ]       [ Slack Alerts ]         - Golden Signals (RED)
     (Critical)           (Warning)              - Saturation & DB Pools
```

---

## 4. Microservices Explanation

| Microservice | Port | Primary Tech | Role & Responsibilities |
|---|---|---|---|
| **api-gateway** | `8000` | FastAPI / Go | Reverse proxy, token-bucket rate limiting (100 req/s burst), JWT verification, distributed tracing propagation (`X-Correlation-ID`). |
| **auth-service** | `8001` | FastAPI / PyJWT | Authentication authority, RS256 public/private key signing, session blacklisting via Redis, RBAC policy enforcement. |
| **items-service** | `8002` | FastAPI / SQLAlchemy | Hardware catalog, SKU queries, read-through caching via Redis (sub-ms response), database writes via PgBouncer. |
| **orders-service** | `8003` | FastAPI / Celery | Distributed saga order checkout, inventory reservation, idempotency check, payment state machine. |
| **notifications-service** | `8004` | Node.js / RabbitMQ | Event-driven alert dispatch, webhook distribution with exponential backoff, Slack/email notifications. |
| **web-console** | `3000` | React 19 / Vite | Production dashboard with topology map, PromQL query runner, Grafana live embed, chaos simulator, and catalog manager. |

---

## 5. Technology Stack
- **Frontend & Admin**: React 19, TypeScript, Tailwind CSS v4, Lucide React, Recharts, Vite.
- **Microservices Framework**: Python 3.12 (FastAPI), Node.js (Express), Uvicorn, Pydantic v2.
- **Data & Caching**: PostgreSQL 16, PgBouncer (Transaction pooling), Redis 7.2 Sentinel.
- **Containerization**: Docker multi-stage builds (distroless/alpine runtimes).
- **Orchestration**: Kubernetes 1.30+, Helm 3, Kustomize.
- **Observability**: Prometheus v2.55, Alertmanager v0.27, Grafana 11.3, Node Exporter, kube-state-metrics.
- **CI/CD**: GitHub Actions, Docker Buildx, Trivy Vulnerability Scanner, SonarQube.

---

## 6. Repository/Folder Structure

```
fusion-microservices/
├── .github/
│   └── workflows/
│       ├── ci-cd.yml                # Automated test, security scan, docker build & deploy
│       └── pr-lint.yml              # Code quality, linting, and helm chart dry-run
├── docker-compose.yml               # Complete 10-service local stack
├── services/
│   ├── api-gateway/
│   │   ├── Dockerfile
│   │   ├── main.py
│   │   └── requirements.txt
│   ├── auth-service/
│   │   ├── Dockerfile
│   │   └── main.py
│   ├── items-service/
│   │   ├── Dockerfile
│   │   └── main.py
│   ├── orders-service/
│   │   ├── Dockerfile
│   │   └── main.py
│   └── notifications-service/
│       ├── Dockerfile
│       └── server.js
├── k8s/
│   ├── base/
│   │   ├── namespace.yaml
│   │   ├── configmaps.yaml
│   │   ├── secrets.yaml
│   │   ├── api-gateway.yaml
│   │   ├── items-service.yaml       # Deployment, Service, HPA, PDB, ServiceMonitor
│   │   ├── ingress.yaml
│   │   └── network-policies.yaml
│   └── overlays/
│       ├── dev/
│       └── prod/
├── helm/
│   └── fusion-platform/
│       ├── Chart.yaml
│       ├── values.yaml
│       └── templates/
├── ops/
│   ├── prometheus/
│   │   ├── prometheus.yml           # Dual-node scrape configurations
│   │   ├── recording_rules.yml      # SRE multi-window burn-rate rules
│   │   └── alerts.yml               # High CPU, Latency, Error-rate, Pod crash alerts
│   ├── alertmanager/
│   │   └── alertmanager.yml         # Dual-node HA cluster mesh & routing
│   └── grafana/
│       ├── provisioning/
│       │   ├── datasources/prometheus.yml
│       │   └── dashboards/dashboards.yml
│       └── dashboards/
│           └── slo-overview.json    # Grafana 11 Golden Signals & Burn Rate dashboard
├── src/                             # Management Web Application (React 19)
├── server.ts                        # Full-stack mock engine & real /metrics exposition
└── README.md                        # Master DevOps Documentation
```

---

## 7. Prerequisites
Ensure the following CLI tools are installed on your workstation:
- **Docker Engine** (v26.0+) and **Docker Compose** (v2.27+)
- **Kubernetes CLI (`kubectl`)** (v1.30+)
- **Minikube**, **Kind**, or managed cloud Kubernetes cluster (EKS, GKE, AKS)
- **Helm** (v3.14+)
- **cURL** and **jq** (for testing APIs and metrics endpoints)
- **Git**

---

## 8. Local Development Setup & Master Port Access Guide

### 🌐 Complete Local Port Allocation & Access Matrix

All services are configured with non-conflicting host ports so the entire stack—including the Web Management Console, all 5 microservices, databases, and the full observability suite—runs concurrently without port collisions.

| Component / Service | Host URL | Port Mapping (Host:Container) | Credentials / Auth | Purpose & What to Expect |
|---|---|---|---|---|
| **Web Operations Console** | [http://localhost:3000](http://localhost:3000) | `3000:3000` | None | Interactive UI: Topology mesh, PromQL runner, Grafana live embed, chaos simulator, catalog manager. |
| **Grafana 11 Dashboards** | [http://localhost:3001](http://localhost:3001) | `3001:3000` *(avoid conflict!)* | `admin` / `admin` | Auto-provisioned Google SRE Golden Signals, 99.9% SLO Availability, and Multi-Window Burn Rate gauges. |
| **Prometheus UI & PromQL** | [http://localhost:9090](http://localhost:9090) | `9090:9090` | None | PromQL query engine, target health grid (all 5 microservices UP), alert rule states. |
| **Alertmanager Console** | [http://localhost:9093](http://localhost:9093) | `9093:9093` | None | Active alert routing, notification receivers, alert silence management. |
| **API Gateway (FastAPI)** | [http://localhost:8000](http://localhost:8000) | `8000:8000` | None | Reverse proxy with rate limiting, Swagger UI at [`/docs`](http://localhost:8000/docs), metrics at `/metrics`. |
| **Auth & Identity Service** | [http://localhost:8001](http://localhost:8001) | `8001:8001` | `admin` / `fusion2026` | RS256 token authority, Swagger at [`/docs`](http://localhost:8001/docs), JWKS at `/.well-known/jwks.json`. |
| **Items Catalog Service** | [http://localhost:8002](http://localhost:8002) | `8002:8002` | None | Hardware catalog API, Swagger at [`/docs`](http://localhost:8002/docs), `/items`, Redis cache metrics. |
| **Orders Processing Service**| [http://localhost:8003](http://localhost:8003) | `8003:8003` | None | Saga checkout coordinator, Swagger at [`/docs`](http://localhost:8003/docs), `/orders`, idempotency store. |
| **Notifications Service** | [http://localhost:8004](http://localhost:8004) | `8004:8004` | None | Webhook dispatcher, health at `/health/live`, metrics at `/metrics`. |
| **PostgreSQL 16 Database** | `localhost:5432` | `5432:5432` | `fusion` / `secret` (`fusion_db`) | Relational database with persistent volume `pg_data`. |
| **Redis 7 Cache / Sessions**| `localhost:6379` | `6379:6379` | None | In-memory key-value cache and session store with persistent volume `redis_data`. |

> ⚠️ **CRITICAL PORT NOTE (Port 3000 vs 3001)**:
> By default, both Grafana and Vite use port `3000`. To prevent the notorious `bind: address already in use 0.0.0.0:3000` error:
> - **Web Operations Console** runs on **`http://localhost:3000`**
> - **Grafana** is mapped to host port **`http://localhost:3001`** (`3001:3000` in `docker-compose.yml`)

---

### 🚀 How to Run the Entire Stack Locally (Step-by-Step)

#### Step 1: Start the Backend Microservices & Observability Stack
Run all 10 containers (Microservices, PostgreSQL, Redis, Prometheus, Alertmanager, Grafana) with one command from the project root:

```bash
# 1. Clone the repository and enter directory
git clone https://github.com/Cloud-Tamil/Application-Projects.git
cd "Application-Projects"

# 2. Start all 10 Docker containers in background
docker compose up -d --build

# 3. Verify all 10 containers are Healthy / Running
docker compose ps
```

You will see:
```text
NAME                            IMAGE                               STATUS
fusion-alertmanager             prom/alertmanager:v0.27.0           Up (healthy)
fusion-api-gateway              fusion/api-gateway:v2.5.0           Up (healthy)
fusion-auth-service             fusion/auth-service:v2.5.0          Up (healthy)
fusion-grafana                  grafana/grafana:11.3.1              Up (healthy)
fusion-items-service            fusion/items-service:v2.5.0         Up (healthy)
fusion-notifications-service    fusion/notifications-service:v2.5.0 Up (healthy)
fusion-orders-service           fusion/orders-service:v2.5.0        Up (healthy)
fusion-postgres                 postgres:16-alpine                  Up (healthy)
fusion-prometheus               prom/prometheus:v2.55.0             Up (healthy)
fusion-redis                    redis:7-alpine                      Up (healthy)
```

#### Step 2: Start the Web Management Console
In a separate terminal window, launch the interactive React + Vite frontend:

```bash
# Install frontend dependencies
npm install

# Start the dev server on port 3000
npm run dev
```

Now open your browser and navigate to:
👉 **`http://localhost:3000`**

#### Step 3: Verify the Observability Suite
- **Open Grafana**: [http://localhost:3001](http://localhost:3001)  
  Log in with username `admin` and password `admin`. Go to **Dashboards** > **Fusion SRE** > **Google SRE Golden Signals & SLO Availability** to see live metrics.
- **Open Prometheus**: [http://localhost:9090](http://localhost:9090)  
  Navigate to **Status** > **Targets** to confirm that all microservice scrape targets are in state **UP** (100% green).
- **Open Alertmanager**: [http://localhost:9093](http://localhost:9093)  
  View active alert rules and silences.

---

## 9. Common Docker & Runtime Errors — Root Causes & Complete Fixes

If you encounter any of the following errors while building or running locally, here is the exact diagnosis and how it has been permanently resolved:

### ❌ Error 1: `notifications-service` npm ci exit code 1
```text
target notifications-service: failed to solve: process "/bin/sh -c npm ci --only=production" did not complete successfully: exit code: 1
```
* **Root Cause**: `npm ci` strictly requires an existing `package-lock.json` file in the build context. If only `package.json` was present, `npm ci` fails immediately. In addition, `--only=production` is deprecated in modern npm (npm 7+ bundled with Node 20).
* **Fix Applied**: 
  1. Generated `services/notifications-service/package-lock.json` locking `express` and `prom-client`.
  2. Updated `services/notifications-service/Dockerfile` line 5 to use a resilient command:
     ```dockerfile
     RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev --no-audit --no-fund; fi
     ```

---

### ❌ Error 2: Alertmanager `invalid Slack webhook URL` & Cluster Peer Lookup
```text
loading config file failed: parse "${SLACK_WEBHOOK_URL}": invalid URI for request
level=warn msg="failed to join cluster" err="lookup alertmanager-node2: no such host"
```
* **Root Cause**: Alertmanager fails to parse unexpanded bash variable placeholders `${SLACK_WEBHOOK_URL}` as valid URLs at startup and crashes. Additionally, in standalone local mode, attempting to resolve gossip peer `alertmanager-node2:9094` caused continuous lookup failures.
* **Fix Applied**: 
  1. Updated `ops/alertmanager/alertmanager.yml` to route alerts to `http://notifications-service:8004/notifications/dispatch` by default with empty `peers: []`.
  2. Added `--cluster.listen-address=` to `docker-compose.yml` so Alertmanager starts cleanly in standalone mode.

---

### ❌ Error 3: Prometheus `lookup node-exporter: no such host`
```text
caller=scrape.go:1422 msg="Scrape failed" err="dial tcp: lookup node-exporter: no such host"
```
* **Root Cause**: `prometheus.yml` targeted `node-exporter:9100` and `alertmanager-node2:9094`, which are Kubernetes cluster components not present in standard local docker-compose. Meanwhile, `notifications-service:8004` was missing from scrape configs.
* **Fix Applied**: Cleaned up `ops/prometheus/prometheus.yml` to scrape the 5 microservices running in docker-compose (`api-gateway:8000`, `auth-service:8001`, `items-service:8002`, `orders-service:8003`, `notifications-service:8004`) and pointed alertmanagers to `alertmanager:9093`.

---

### ❌ Error 4: Browser CORS Block (`No 'Access-Control-Allow-Origin' header`)
```text
Access to fetch at 'http://localhost:8000/api/items' from origin 'http://localhost:3000' has been blocked by CORS policy
```
* **Root Cause**: The FastAPI and Node.js microservices lacked CORS middleware headers, preventing browser clients on `http://localhost:3000` from making asynchronous fetch calls.
* **Fix Applied**: Added `CORSMiddleware` (`allow_origins=["*"]`, `allow_methods=["*"]`, `allow_headers=["*"]`) across `api-gateway`, `auth-service`, `items-service`, `orders-service`, and express CORS headers in `notifications-service`.

---

### ❌ Error 5: Container Healthcheck Failure (`curl: not found`)
```text
HEALTHCHECK --interval=10s CMD curl -f http://localhost:800x/health/live || exit 1
Container status: unhealthy (exec: "curl": executable file not found in $PATH)
```
* **Root Cause**: `python:3.12-slim` minimal base images do not include `curl` by default.
* **Fix Applied**: Added `apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*` to the runner stage of each Python microservice Dockerfile.

---

## 10. Docker Compose Commands
Run the complete 10-container microservices and observability topology:

```bash
# Start all microservices, databases, Prometheus, Grafana, and Alertmanager
docker compose up -d --build

# Verify container status
docker compose ps

# Inspect logs for a specific service
docker compose logs -f items-service

# Dynamically scale the items microservice to 3 replicas
docker compose up -d --scale items-service=3

# Stop containers and preserve database volumes
docker compose stop

# Destroy containers, networks, and volumes
docker compose down -v
```

---

## 11. Kubernetes Deployment Commands
Deploy the microservices platform onto Kubernetes:

```bash
# 1. Create dedicated namespace
kubectl create namespace fusion-prod --dry-run=client -o yaml | kubectl apply -f -

# 2. Deploy ConfigMaps and Secrets
kubectl apply -f k8s/base/configmaps.yaml -n fusion-prod
kubectl apply -f k8s/base/secrets.yaml -n fusion-prod

# 3. Apply stateful data services (PostgreSQL & Redis)
kubectl apply -f k8s/base/postgres.yaml -n fusion-prod
kubectl apply -f k8s/base/redis.yaml -n fusion-prod

# 4. Deploy domain microservices with HPA & PDB
kubectl apply -f k8s/base/items-service.yaml -n fusion-prod
kubectl apply -f k8s/base/api-gateway.yaml -n fusion-prod
kubectl apply -f k8s/base/auth-service.yaml -n fusion-prod
kubectl apply -f k8s/base/orders-service.yaml -n fusion-prod
kubectl apply -f k8s/base/notifications-service.yaml -n fusion-prod

# 5. Deploy Ingress Controller rules
kubectl apply -f k8s/base/ingress.yaml -n fusion-prod

# 6. Verify rollout status
kubectl rollout status deployment/items-service -n fusion-prod
kubectl rollout status deployment/api-gateway -n fusion-prod
```

---

## 12. Kubernetes Troubleshooting Commands
Diagnose and resolve pod or cluster failures:

```bash
# Check all pods with node and IP details
kubectl get pods -n fusion-prod -o wide

# Describe crashing or pending pod
kubectl describe pod -l app=items-service -n fusion-prod

# View live container logs including previous crash logs
kubectl logs -l app=items-service -n fusion-prod --tail=100 -f
kubectl logs <crashing-pod-name> -n fusion-prod --previous

# Check cluster events sorted by timestamp
kubectl get events -n fusion-prod --sort-by='.metadata.creationTimestamp'

# Execute into running container for network diagnostic
kubectl exec -it deployment/items-service -n fusion-prod -- nc -zv postgres 5432

# Verify Horizontal Pod Autoscaler (HPA) targets
kubectl get hpa -n fusion-prod
```

---

## 13. Prometheus Installation and Configuration
Deploy the dual-node Prometheus High Availability setup via Helm or manifests:

```bash
# Add Prometheus community repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install kube-prometheus-stack in monitoring namespace
helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  -f ops/prometheus/values.yaml

# Apply custom multi-window recording rules and alert rules
kubectl apply -f ops/prometheus/recording_rules.yml -n monitoring
kubectl apply -f ops/prometheus/alerts.yml -n monitoring

# Port-forward Prometheus Web UI
kubectl port-forward svc/prometheus-k8s 9090:9090 -n monitoring
```

---

## 14. Grafana Installation and Configuration
Access and configure Grafana 11:

```bash
# Port-forward Grafana Service
kubectl port-forward svc/prometheus-grafana 3001:80 -n monitoring

# Retrieve default admin password
kubectl get secret --namespace monitoring prometheus-grafana -o jsonpath="{.data.admin-password}" | base64 --decode ; echo

# Verify provisioned Prometheus data source
curl -u admin:admin http://localhost:3001/api/datasources | jq
```

---

## 15. Grafana Dashboard Setup
The project includes automated provisioning for the **SLO & Golden Signals** dashboard:
1. Navigating to `http://localhost:3001` automatically mounts the `ops/grafana/dashboards/slo-overview.json`.
2. **Dashboard Panels**:
   - **Availability SLO (5m)**: Tracks `job:fusion_slo_availability:5m` against 99.9% target.
   - **Multi-Window Burn Rate**: Gauge for `job:fusion_slo_burn_rate:5m` (Critical > 14.4x, Warning > 6x).
   - **RED Signals**: Request Rate (RPS), Latency p50/p95/p99 histograms, and 5xx error percentages.
   - **Database & Cache Saturation**: PgBouncer active pool percentage and Redis hit/miss ratio.

---

## 16. Alertmanager Configuration
High availability dual-node Alertmanager mesh configuration (`ops/alertmanager/alertmanager.yml`):

```yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 15s
  group_interval: 1m
  repeat_interval: 3h
  receiver: 'slack-warning-channel'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
      continue: true
    - match:
        severity: warning
      receiver: 'slack-warning-channel'

receivers:
  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: '${PAGERDUTY_KEY}'
        severity: 'critical'

  - name: 'slack-warning-channel'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#incidents-platform'
        send_resolved: true
```

---

## 17. Monitoring and Observability Architecture
Our observability pipeline adheres to Google SRE principles:
- **Four Golden Signals**:
  - **Latency**: Measured at ingress and per-pod via histogram buckets (`http_request_duration_seconds_bucket`).
  - **Traffic**: Request rate computed via `rate(http_requests_total[5m])`.
  - **Errors**: 5xx error rate computed via `sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))`.
  - **Saturation**: Memory working set, CPU throttle ratio, and connection pool queues.
- **Alert Rules Configured**:
  1. `FusionHighCPUUsage` (>85% for 5m)
  2. `FusionHighMemoryUsage` (>90% for 5m)
  3. `FusionPodCrashLooping` (>3 restarts in 10m)
  4. `FusionServiceDown` (UP == 0 for 1m)
  5. `FusionHighErrorRate` (>5% 5xx for 3m)
  6. `FusionHighLatencyP95` (p95 > 1000ms for 3m)
  7. `FusionSLOFastBurn` (Burn rate > 14.4x consuming 2% budget in 1 hour)

---

## 18. CI/CD Pipeline Explanation
The GitHub Actions workflow (`.github/workflows/ci-cd.yml`) automates testing and deployment:
1. **Lint & Test Stage**: Runs flake8, black, pytest, and jest on pull requests.
2. **Security Vulnerability Scan**: Trivy scans Docker images for CVEs; SonarQube checks code quality gates.
3. **Multi-Arch Docker Build & Push**: Uses Docker Buildx to push version-tagged images (`v2.5.x`) and Git SHA tags to GitHub Container Registry (GHCR) or Docker Hub.
4. **GitOps CD Rollout**: Updates Kubernetes manifests via Helm/Kustomize and triggers progressive zero-downtime rollouts.

---

## 19. Deployment Procedure
Execute a zero-downtime rolling update:

```bash
# 1. Update image in production deployment
kubectl set image deployment/items-service \
  items-service=ghcr.io/cloud-tamil/items-service:v2.5.1 \
  -n fusion-prod

# 2. Watch rolling update progression
kubectl rollout status deployment/items-service -n fusion-prod -w

# 3. Verify pods transitioning with readiness probes
kubectl get pods -l app=items-service -n fusion-prod
```

---

## 20. Rollback Procedure
If a regression or alert fires post-deployment:

```bash
# 1. Inspect deployment rollout revision history
kubectl rollout history deployment/items-service -n fusion-prod

# 2. Undo rollout to immediately revert to previous stable revision
kubectl rollout undo deployment/items-service -n fusion-prod

# 3. Or rollback to a specific revision number
kubectl rollout undo deployment/items-service --to-revision=2 -n fusion-prod

# 4. Verify rollback health
kubectl rollout status deployment/items-service -n fusion-prod
```

---

## 21. Scaling Commands
Adjust capacity manually or configure autoscaling:

```bash
# Manually scale deployment to 6 replicas
kubectl scale deployment/items-service --replicas=6 -n fusion-prod

# Inspect Horizontal Pod Autoscaler status and current metrics
kubectl get hpa items-service-hpa -n fusion-prod

# Edit HPA parameters (e.g., minimum and maximum replica limits)
kubectl patch hpa items-service-hpa -n fusion-prod \
  -p '{"spec":{"minReplicas":4,"maxReplicas":12}}'
```

---

## 22. Logs and Troubleshooting Commands

```bash
# Stream live logs from all pods belonging to items-service
kubectl logs -f -l app=items-service -n fusion-prod --max-log-requests=10

# Filter logs for errors and exceptions
kubectl logs -l app=items-service -n fusion-prod | grep -E "ERROR|Exception|500"

# Follow logs from NGINX Ingress Controller
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx -f --tail=100
```

---

## 23. Useful Docker Commands

```bash
# View live container resource consumption (CPU, Memory, Net I/O)
docker stats --no-stream

# Clean up dangling images, stopped containers, and build cache
docker system prune -af --volumes

# Copy file from container to host
docker cp fusion-items:/app/logs/audit.log ./audit.log

# Inspect container network settings
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' fusion-items
```

---

## 24. Useful Kubernetes Commands

```bash
# View node resource allocation and capacity
kubectl top nodes
kubectl top pods -n fusion-prod

# Check resource limits vs actual usage
kubectl describe nodes | grep -A 8 "Allocated resources:"

# Drain a node safely for maintenance (respects PodDisruptionBudgets)
kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data

# Uncordon node after maintenance
kubectl uncordon node-1
```

---

## 25. Useful Helm Commands

```bash
# List all Helm releases across all namespaces
helm list -A

# Render templates locally without installing (dry-run)
helm template fusion-release helm/fusion-platform/ -f helm/fusion-platform/values.yaml

# Rollback a Helm release to a previous revision
helm rollback fusion-release 1 -n fusion-prod

# View values passed to an existing release
helm get values fusion-release -n fusion-prod
```

---

## 26. Useful Prometheus Commands

```bash
# Reload Prometheus configuration without restarting pod
curl -X POST http://localhost:9090/-/reload

# Query instant PromQL vector via cURL
curl -sG --data-urlencode 'query=job:fusion_error_rate:5m' \
  http://localhost:9090/api/v1/query | jq

# Verify active targets and health
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'
```

---

## 27. Useful Grafana-Related Commands

```bash
# Export Grafana dashboard via API
curl -s -u admin:admin http://localhost:3001/api/dashboards/uid/slo-overview | jq . > exported-dashboard.json

# Restart Grafana deployment in Kubernetes
kubectl rollout restart deployment/prometheus-grafana -n monitoring
```

---

## 28. Application Testing Commands

```bash
# Run backend pytest suite
pytest services/items-service/tests/ -v --cov=services/items-service

# Run synthetic load test against API Gateway (200 concurrent users for 30s)
hey -n 10000 -c 200 http://localhost:8000/api/items

# Verify distributed trace header propagation
curl -i -H "X-Correlation-ID: audit-test-999" http://localhost:8000/api/items
```

---

## 29. Health-Check Commands

```bash
# Test Kubernetes Liveness Probe
curl -s -i http://localhost:8000/health/live

# Test Kubernetes Readiness Probe
curl -s -i http://localhost:8000/health/ready

# Test Startup Probe
curl -s -i http://localhost:8000/health/startup
```

---

## 30. Cleanup/Destroy Commands

```bash
# Delete all Kubernetes resources in fusion-prod namespace
kubectl delete namespace fusion-prod

# Uninstall Helm Prometheus stack
helm uninstall prometheus -n monitoring

# Destroy local Docker Compose environment and remove persistent volumes
docker compose down --volumes --remove-orphans
```
