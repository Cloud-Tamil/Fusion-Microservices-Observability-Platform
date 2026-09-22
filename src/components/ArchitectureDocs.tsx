import React, { useState } from 'react';
import { 
  FileText, 
  Copy, 
  Check, 
  Terminal, 
  Layers, 
  BookOpen, 
  ShieldCheck, 
  Cpu, 
  Database,
  ArrowRight,
  ExternalLink,
  GitBranch,
  Search,
  CheckCircle2
} from 'lucide-react';
import { 
  DOCKER_COMPOSE_CONTENT, 
  KUBERNETES_MANIFEST_CONTENT, 
  PROMETHEUS_YML_CONTENT, 
  RECORDING_RULES_CONTENT 
} from '../data/deploymentTemplates';

const CI_CD_WORKFLOW_CONTENT = `name: Fusion CI/CD Pipeline
on:
  push:
    branches: [ main ]
    tags: [ 'v*.*.*' ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    name: Lint & Pytest Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install flake8 pytest && flake8 . && pytest

  security-scan:
    name: Trivy Security Scan
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          severity: 'CRITICAL,HIGH'

  build-and-push:
    name: Docker Build & Push to GHCR
    runs-on: ubuntu-latest
    needs: security-scan
    if: github.event_name == 'push'
    strategy:
      matrix:
        service: [api-gateway, items-service, auth-service, orders-service]
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: .
          file: services/\${{ matrix.service }}/Dockerfile
          push: true
          tags: ghcr.io/cloud-tamil/fusion-\${{ matrix.service }}:v2.5.0

  deploy:
    name: K8s Zero-Downtime Rollout
    runs-on: ubuntu-latest
    needs: build-and-push
    steps:
      - uses: actions/checkout@v4
      - run: kubectl apply -k k8s/overlays/prod/ && kubectl rollout status deployment/items-service -n fusion-prod`;

const HELM_VALUES_CONTENT = `global:
  environment: production
  domain: fusion.cloudtamil.io

replicaCount: 3

image:
  repository: ghcr.io/cloud-tamil/fusion-items-service
  tag: "v2.5.0"
  pullPolicy: IfNotPresent

resources:
  limits:
    cpu: 1000m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 128Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

pdb:
  enabled: true
  minAvailable: 2

serviceMonitor:
  enabled: true
  interval: 15s`;

const SECTIONS_30 = [
  { id: 1, title: 'Project Overview', summary: 'Refactored FastAPI monolith into 5 independent domain microservices with Zero-SPOF PostgreSQL & Redis.' },
  { id: 2, title: 'Architecture Overview', summary: 'Ingress NGINX -> API Gateway -> Envoy / Services -> PgBouncer / Redis Sentinel -> Observability plane.' },
  { id: 3, title: 'Architecture Diagram', summary: 'ASCII and visual flow showing Client, Ingress, 5 Microservices, Data tiers, and Prometheus/Grafana.' },
  { id: 4, title: 'Microservices Explanation', summary: 'API Gateway (:8000), Auth (:8001), Items Catalog (:8002), Orders (:8003), Notifications (:8004).' },
  { id: 5, title: 'Technology Stack', summary: 'React 19, FastAPI, PostgreSQL 16, Redis 7, Docker, Kubernetes, Helm, Prometheus v2.55, Grafana 11.' },
  { id: 6, title: 'Repository/Folder Structure', summary: 'Production monorepo layout with /services, /k8s, /helm, /ops, /.github/workflows, /src.' },
  { id: 7, title: 'Prerequisites', summary: 'Docker 26+, Docker Compose 2.27+, kubectl 1.30+, Helm 3.14+, cURL, jq, Minikube/Kind/EKS.' },
  { id: 8, title: 'Local Development Setup', summary: 'Git clone, .env.example setup, dependency installation, and local bridge network initialization.' },
  { id: 9, title: 'Docker Build & Run', summary: 'Multi-stage Dockerfiles with non-root security contexts, build caching, and container inspection.' },
  { id: 10, title: 'Docker Compose Commands', summary: 'docker compose up -d --build, --scale items-service=3, logs -f, and resource teardown.' },
  { id: 11, title: 'Kubernetes Deployment', summary: 'kubectl apply -f k8s/ for Namespace, ConfigMaps, Secrets, Deployments, HPAs, and Ingress.' },
  { id: 12, title: 'Kubernetes Troubleshooting', summary: 'kubectl describe pod, logs --previous, get events --sort-by, and pod exec network diagnostics.' },
  { id: 13, title: 'Prometheus Installation', summary: 'kube-prometheus-stack Helm installation, custom scrape configs, and dual-node HA scraping.' },
  { id: 14, title: 'Grafana Installation', summary: 'Grafana 11 deployment, admin password extraction, and automated Prometheus datasource provisioning.' },
  { id: 15, title: 'Grafana Dashboard Setup', summary: 'Auto-provisioned Golden Signals (RED), 99.9% SLO Availability, and Multi-Window Burn Rate panels.' },
  { id: 16, title: 'Alertmanager Configuration', summary: 'Dual-node gossip mesh (:9093/:9094), PagerDuty critical escalation, and Slack notification routes.' },
  { id: 17, title: 'Observability Architecture', summary: 'Four Golden Signals (Latency, Traffic, Errors, Saturation) and 8 critical production alert rules.' },
  { id: 18, title: 'CI/CD Pipeline Explanation', summary: 'GitHub Actions 4-stage pipeline: Lint/Test -> Trivy CVE Scan -> Multi-Arch Build -> K8s GitOps Rollout.' },
  { id: 19, title: 'Deployment Procedure', summary: 'kubectl set image zero-downtime rolling update with readiness probe gating and revision tracking.' },
  { id: 20, title: 'Rollback Procedure', summary: 'kubectl rollout undo and --to-revision recovery to revert regressions within seconds.' },
  { id: 21, title: 'Scaling Commands', summary: 'Manual replica scaling (kubectl scale) and dynamic HPA auto-scaling adjustments.' },
  { id: 22, title: 'Logs & Troubleshooting', summary: 'kubectl logs -l app=items-service with regex filters for 5xx errors and Ingress logs.' },
  { id: 23, title: 'Useful Docker Commands', summary: 'docker stats, system prune -af, docker inspect, and container health verification.' },
  { id: 24, title: 'Useful Kubernetes Commands', summary: 'kubectl top nodes/pods, describe nodes allocated resources, and safe node drain/uncordon.' },
  { id: 25, title: 'Useful Helm Commands', summary: 'helm template dry-run, helm upgrade --install, helm rollback, and helm get values.' },
  { id: 26, title: 'Useful Prometheus Commands', summary: 'Prometheus /-/reload lifecycle trigger, instant vector cURL queries, and targets inspection.' },
  { id: 27, title: 'Useful Grafana Commands', summary: 'Dashboard JSON export via REST API, API key creation, and pod rolling restarts.' },
  { id: 28, title: 'Application Testing Commands', summary: 'pytest test suite execution, hey/wrk synthetic load testing, and trace header checks.' },
  { id: 29, title: 'Health-Check Commands', summary: 'Verification of /health/live, /health/ready, and /health/startup endpoints via cURL.' },
  { id: 30, title: 'Cleanup/Destroy Commands', summary: 'Teardown commands for Kubernetes namespaces, Helm releases, and Docker volumes.' },
];

export const ArchitectureDocs: React.FC = () => {
  const [activeFileTab, setActiveFileTab] = useState<'30sections' | 'compose' | 'k8s' | 'cicd' | 'helm' | 'prometheus' | 'rules'>('30sections');
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const getFileContent = () => {
    switch (activeFileTab) {
      case 'compose':
        return DOCKER_COMPOSE_CONTENT;
      case 'k8s':
        return KUBERNETES_MANIFEST_CONTENT;
      case 'cicd':
        return CI_CD_WORKFLOW_CONTENT;
      case 'helm':
        return HELM_VALUES_CONTENT;
      case 'prometheus':
        return PROMETHEUS_YML_CONTENT;
      case 'rules':
        return RECORDING_RULES_CONTENT;
      case '30sections':
      default:
        return SECTIONS_30.map((s) => `### ${s.id}. ${s.title}\n${s.summary}\n`).join('\n');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getFileContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredSections = SECTIONS_30.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded-md border border-cyan-800/60">
                DevOps &amp; Cloud Architecture Hub
              </span>
              <span className="text-xs text-slate-400 font-mono">30 Production Documentation Sections</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Microservices, Kubernetes &amp; Observability Playbook
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-3xl">
              Engineered as a real-world Cloud and DevOps portfolio project for technical interviews.
              Contains full architecture breakdowns, Helm charts, CI/CD pipelines, and Prometheus alerting definitions.
            </p>
          </div>
        </div>
      </div>

      {/* 30-Section Portfolio Guide Viewer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5 text-cyan-400" />
            <h3 className="font-bold text-white text-base">
              The 30 DevOps Architecture &amp; Runbook Modules
            </h3>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter topics (e.g., HPA, Helm, Alerts)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1">
          {filteredSections.map((sec) => (
            <div
              key={sec.id}
              className="p-3.5 bg-slate-950 border border-slate-800 hover:border-cyan-800/80 rounded-xl transition space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 font-mono">
                  SECTION {sec.id.toString().padStart(2, '0')}
                </span>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <h4 className="text-sm font-bold text-slate-100 font-sans">{sec.title}</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{sec.summary}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Manifests & Configuration Viewer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
            {[
              { key: '30sections', label: '30 Sections Summary' },
              { key: 'compose', label: 'docker-compose.yml' },
              { key: 'k8s', label: 'k8s/items-service.yaml' },
              { key: 'cicd', label: '.github/workflows/ci-cd.yml' },
              { key: 'helm', label: 'helm/values.yaml' },
              { key: 'prometheus', label: 'prometheus.yml' },
              { key: 'rules', label: 'recording_rules.yml' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFileTab(tab.key as any)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono whitespace-nowrap transition ${
                  activeFileTab === tab.key
                    ? 'bg-cyan-950 text-cyan-400 border-cyan-800'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleCopy}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono flex items-center transition self-start sm:self-auto"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Copy Manifest
              </>
            )}
          </button>
        </div>

        {/* Code Block */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-[480px] leading-relaxed whitespace-pre select-all">
          {getFileContent()}
        </div>
      </div>
    </div>
  );
};
