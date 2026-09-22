import time
import os
import uuid
from typing import Optional
from fastapi import FastAPI, Request, Response, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

app = FastAPI(
    title="Fusion API Gateway",
    version="2.5.0",
    description="High-availability reverse proxy with rate limiting, tracing, and Prometheus metrics"
)

# Enable CORS for browser frontends and local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service URLs from Environment
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://auth-service:8001")
ITEMS_SERVICE_URL = os.getenv("ITEMS_SERVICE_URL", "http://items-service:8002")
ORDERS_SERVICE_URL = os.getenv("ORDERS_SERVICE_URL", "http://orders-service:8003")
NOTIFICATIONS_SERVICE_URL = os.getenv("NOTIFICATIONS_SERVICE_URL", "http://notifications-service:8004")
RATE_LIMIT_RPS = int(os.getenv("RATE_LIMIT_RPS", "100"))

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

RATE_LIMIT_EXCEEDED = Counter(
    "fusion_gateway_rate_limit_exceeded_total",
    "Total requests rejected by token bucket rate limiter"
)

# Token Bucket Rate Limiting State
RATE_LIMIT_TOKENS = float(RATE_LIMIT_RPS)
LAST_TOKEN_REFRESH = time.time()

def check_rate_limit() -> bool:
    global RATE_LIMIT_TOKENS, LAST_TOKEN_REFRESH
    now = time.time()
    elapsed = now - LAST_TOKEN_REFRESH
    LAST_TOKEN_REFRESH = now
    RATE_LIMIT_TOKENS = min(float(RATE_LIMIT_RPS), RATE_LIMIT_TOKENS + elapsed * RATE_LIMIT_RPS)
    if RATE_LIMIT_TOKENS >= 1.0:
        RATE_LIMIT_TOKENS -= 1.0
        return True
    return False

@app.middleware("http")
async def telemetry_and_trace_middleware(request: Request, call_next):
    # Enforce Rate Limiting (except on health and metrics probes)
    if request.url.path not in ["/health/live", "/health/ready", "/metrics"]:
        if not check_rate_limit():
            RATE_LIMIT_EXCEEDED.inc()
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"error": "Rate limit exceeded", "limit_rps": RATE_LIMIT_RPS},
                headers={"Retry-After": "1"}
            )

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
    return {
        "status": "ready",
        "service": "api-gateway",
        "downstreams": {
            "auth": AUTH_SERVICE_URL,
            "items": ITEMS_SERVICE_URL,
            "orders": ORDERS_SERVICE_URL,
            "notifications": NOTIFICATIONS_SERVICE_URL
        }
    }

@app.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

# Helper proxy client
async def proxy_request(service_url: str, path: str, request: Request):
    target_url = f"{service_url.rstrip('/')}/{path.lstrip('/')}"
    headers = dict(request.headers)
    headers.pop("host", None)
    body = await request.body()
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.request(
                method=request.method,
                url=target_url,
                headers=headers,
                params=dict(request.query_params),
                content=body
            )
            return Response(
                content=resp.content,
                status_code=resp.status_code,
                headers=dict(resp.headers)
            )
    except httpx.RequestError as exc:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"error": "Downstream service unreachable", "target": target_url, "details": str(exc)}
        )

# API Gateway Routes to Downstream Services
@app.api_route("/api/auth/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_auth(path: str, request: Request):
    return await proxy_request(AUTH_SERVICE_URL, f"auth/{path}", request)

@app.api_route("/api/items/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_items_subpath(path: str, request: Request):
    return await proxy_request(ITEMS_SERVICE_URL, f"items/{path}", request)

@app.api_route("/api/items", methods=["GET", "POST"])
async def proxy_items_root(request: Request):
    return await proxy_request(ITEMS_SERVICE_URL, "items", request)

@app.api_route("/api/orders/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_orders_subpath(path: str, request: Request):
    return await proxy_request(ORDERS_SERVICE_URL, f"orders/{path}", request)

@app.api_route("/api/orders", methods=["GET", "POST"])
async def proxy_orders_root(request: Request):
    return await proxy_request(ORDERS_SERVICE_URL, "orders", request)

@app.api_route("/api/notifications/{path:path}", methods=["GET", "POST"])
async def proxy_notifications(path: str, request: Request):
    return await proxy_request(NOTIFICATIONS_SERVICE_URL, f"notifications/{path}", request)

@app.get("/")
async def root():
    return {
        "service": "Fusion API Gateway",
        "version": "2.5.0",
        "status": "operational",
        "docs": "/docs",
        "routes": {
            "items": "/api/items",
            "auth": "/api/auth/login",
            "orders": "/api/orders",
            "notifications": "/api/notifications/dispatch",
            "metrics": "/metrics",
            "health": "/health/live"
        }
    }

