import React, { useState } from 'react';
import { 
  Server, 
  Database, 
  ShieldCheck, 
  Cpu, 
  Zap, 
  AlertCircle, 
  CheckCircle, 
  ArrowRight, 
  Plus, 
  Minus, 
  RotateCw, 
  Flame,
  Radio,
  ExternalLink,
  Sliders
} from 'lucide-react';
import { MicroserviceNode, PodReplica } from '../types';

interface TopologyViewProps {
  services: MicroserviceNode[];
  onScaleService: (serviceId: string, delta: number) => void;
  onToggleCircuitBreaker: (serviceId: string) => void;
  onKillPod: (serviceId: string, podId: string) => void;
}

export const TopologyView: React.FC<TopologyViewProps> = ({
  services,
  onScaleService,
  onToggleCircuitBreaker,
  onKillPod,
}) => {
  const [selectedServiceId, setSelectedServiceId] = useState<string>('items-service');

  const selectedService = services.find((s) => s.id === selectedServiceId) || services[0];

  const gatewayService = services.find((s) => s.id === 'gateway');
  const coreServices = services.filter((s) => s.category === 'core');
  const storageServices = services.filter((s) => s.category === 'storage');
  const obsServices = services.filter((s) => s.category === 'observability');

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded-md border border-cyan-800/60">
                Service Mesh Topology & HA
              </span>
              <span className="text-xs text-slate-400 font-mono">10 Nodes Configured • Zero-SPOF</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Decomposed High Availability Microservices Architecture
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-3xl">
              Each domain service operates as an independent Kubernetes deployment with readiness/liveness health probes, 
              PodDisruptionBudgets, and isolated Redis/Postgres connection pooling.
            </p>
          </div>
          <div className="flex items-center space-x-3 text-xs font-mono">
            <div className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-center">
              <div className="text-slate-500 uppercase text-[10px]">Total Pods</div>
              <div className="text-white font-bold text-base">
                {services.reduce((acc, s) => acc + s.pods.length, 0)}
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-center">
              <div className="text-slate-500 uppercase text-[10px]">Mesh Health</div>
              <div className="text-emerald-400 font-bold text-base">100% UP</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Architecture Flow + Service Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Visual Mesh Topology */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tier 1: Ingress Gateway */}
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span>Tier 1: Edge & Ingress Layer (TLS & Rate Limiting)</span>
            </div>
            {gatewayService && (
              <ServiceCard
                service={gatewayService}
                isSelected={selectedService.id === gatewayService.id}
                onSelect={() => setSelectedServiceId(gatewayService.id)}
                onScale={(delta) => onScaleService(gatewayService.id, delta)}
              />
            )}
          </div>

          {/* Connecting Line */}
          <div className="flex justify-center -my-2">
            <div className="h-6 w-0.5 bg-gradient-to-b from-cyan-500 to-blue-600"></div>
          </div>

          {/* Tier 2: Core Microservices */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>Tier 2: Core Domain Services (Decomposed Microservices)</span>
              </div>
              <span className="text-slate-500 font-normal lowercase">inter-service gRPC / HTTP mesh</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {coreServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  isSelected={selectedService.id === service.id}
                  onSelect={() => setSelectedServiceId(service.id)}
                  onScale={(delta) => onScaleService(service.id, delta)}
                />
              ))}
            </div>
          </div>

          {/* Connecting Line */}
          <div className="flex justify-center -my-2">
            <div className="h-6 w-0.5 bg-gradient-to-b from-blue-600 to-indigo-600"></div>
          </div>

          {/* Tier 3: Storage & Persistence (HA) */}
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              <span>Tier 3: Distributed State & Caching Tier (Sentinel HA)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {storageServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  isSelected={selectedService.id === service.id}
                  onSelect={() => setSelectedServiceId(service.id)}
                  onScale={(delta) => onScaleService(service.id, delta)}
                />
              ))}
            </div>
          </div>

          {/* Tier 4: Observability & Telemetry Plane */}
          <div className="pt-2">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Observability Plane: Prometheus, Alertmanager Mesh & Grafana</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {obsServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  isSelected={selectedService.id === service.id}
                  onSelect={() => setSelectedServiceId(service.id)}
                  onScale={(delta) => onScaleService(service.id, delta)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Interactive Service Inspector & Pod Orchestrator */}
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sticky top-24">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">Node Details</span>
                <h3 className="font-bold text-lg text-white font-mono">{selectedService.name}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${selectedService.status === 'healthy' ? 'bg-emerald-400' : 'bg-rose-500'}`}></span>
                <span className="text-xs font-semibold capitalize text-slate-300">{selectedService.status}</span>
              </div>
            </div>

            <p className="text-slate-400 text-xs mt-3 leading-relaxed">
              {selectedService.description}
            </p>

            {/* Spec & Metrics */}
            <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-mono">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase block">Stack</span>
                <span className="text-slate-200 font-medium truncate block">{selectedService.techStack}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase block">Listen Port</span>
                <span className="text-cyan-400 font-bold block">:{selectedService.port}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase block">Throughput</span>
                <span className="text-slate-200 font-bold block">{selectedService.rps} RPS</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase block">p95 Latency</span>
                <span className="text-slate-200 font-bold block">{selectedService.latencyP95Ms} ms</span>
              </div>
            </div>

            {/* Circuit Breaker Control */}
            <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-300 block">Circuit Breaker</span>
                  <span className="text-[11px] text-slate-500">Auto-trips at 25% errors</span>
                </div>
                <button
                  id={`toggle-cb-${selectedService.id}`}
                  onClick={() => onToggleCircuitBreaker(selectedService.id)}
                  className={`px-3 py-1 rounded text-xs font-mono font-medium transition ${
                    selectedService.circuitBreakerState === 'closed'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}
                >
                  {selectedService.circuitBreakerState.toUpperCase()}
                </button>
              </div>
            </div>

            {/* Pod Replica Manager (HPA Simulation) */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Replicas ({selectedService.pods.length} / {selectedService.maxReplicas} Max)
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    id={`scale-down-${selectedService.id}`}
                    onClick={() => onScaleService(selectedService.id, -1)}
                    disabled={selectedService.pods.length <= selectedService.minReplicas}
                    className="p-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
                    title="Scale Down Replica"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    id={`scale-up-${selectedService.id}`}
                    onClick={() => onScaleService(selectedService.id, 1)}
                    disabled={selectedService.pods.length >= selectedService.maxReplicas}
                    className="p-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
                    title="Scale Up Replica (HPA)"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Pod List */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {selectedService.pods.map((pod) => (
                  <div
                    key={pod.id}
                    className="p-2.5 bg-slate-950/80 border border-slate-800/80 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-mono text-slate-300 font-medium">{pod.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {pod.node} • CPU: {pod.cpuUsage}% • RAM: {pod.memoryUsageMb}MB
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                        {pod.status}
                      </span>
                      <button
                        onClick={() => onKillPod(selectedService.id, pod.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Simulate Pod Crash & Kubernetes Auto-Recovery"
                      >
                        <Flame className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-Component for Service Card
interface ServiceCardProps {
  service: MicroserviceNode;
  isSelected: boolean;
  onSelect: () => void;
  onScale: (delta: number) => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, isSelected, onSelect, onScale }) => {
  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-xl border transition cursor-pointer relative overflow-hidden ${
        isSelected
          ? 'bg-slate-800/90 border-cyan-500 ring-1 ring-cyan-500/50 shadow-lg'
          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono font-bold text-sm text-white">{service.name}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
              :{service.port}
            </span>
          </div>
          <span className="text-xs text-slate-400 block mt-0.5">{service.role}</span>
        </div>

        <div className="flex items-center space-x-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              service.status === 'healthy'
                ? 'bg-emerald-400'
                : service.status === 'degraded'
                ? 'bg-amber-400 animate-ping'
                : 'bg-rose-500'
            }`}
          ></span>
          <span className="text-xs font-mono text-slate-400">{service.pods.length} pods</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] font-mono">
        <div>
          <span className="text-slate-500 text-[10px] block">RPS</span>
          <span className="text-slate-300 font-medium">{service.rps}</span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] block">Latency</span>
          <span className="text-slate-300 font-medium">{service.latencyP95Ms}ms</span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] block">Circuit</span>
          <span
            className={`font-medium ${
              service.circuitBreakerState === 'closed' ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {service.circuitBreakerState}
          </span>
        </div>
      </div>
    </div>
  );
};
