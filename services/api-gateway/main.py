import time
import uuid
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.responses import JSONResponse
import httpx
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

app = FastAPI(
    title="Fusion API Gateway",
    version="2.5.0",
    description="High-availability reverse proxy with rate limiting and Prometheus metrics"
)

# Prometheus Metrics
REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total HTTP requests received",
    ["method", "endpoint", "status_code"]
)

REQUEST_DURATION = Histogram(
    "http_request_duration_seconds",
    "Request duration in seconds",
    ["method", "endpoint"],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

@app.middleware("http")
async def telemetry_and_trace_middleware(request: Request, call_next):
    # W3C / Correlation ID distributed tracing
    correlation_id = request.headers.get("X-Correlation-ID") or f"req-{uuid.uuid4().hex[:8]}"
    start_time = time.time()
    
    response = await call_next(request)
    duration = time.time() - start_time
    
    # Record Prometheus metrics
    REQUESTS_TOTAL.labels(
        method=request.method,
        endpoint=request.url.path,
        status_code=response.status_code
    ).inc()
    
    REQUEST_DURATION.labels(
        method=request.method,
        endpoint=request.url.path
    ).observe(duration)
    
    response.headers["X-Correlation-ID"] = correlation_id
    return response

@app.get("/health/live")
async def liveness():
    return {"status": "alive", "service": "api-gateway"}

@app.get("/health/ready")
async def readiness():
    # In real k8s probe, test connection to downstream services
    return {"status": "ready", "service": "api-gateway"}

@app.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.get("/")
async def root():
    return {
        "service": "Fusion API Gateway",
        "version": "2.5.0",
        "status": "operational",
        "docs": "/docs"
    }
