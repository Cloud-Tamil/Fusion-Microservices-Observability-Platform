import time
import os
import uuid
from fastapi import FastAPI, Response, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST

app = FastAPI(title="Fusion Auth & Identity Service", version="2.5.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus Metrics
AUTH_SUCCESS = Counter("fusion_auth_success_total", "Total successful authentication attempts")
AUTH_FAILURES = Counter("fusion_auth_failure_total", "Total failed authentication attempts")
TOKEN_VERIFICATIONS = Counter("fusion_token_verifications_total", "Total token verification requests")
ACTIVE_SESSIONS = Gauge("fusion_active_sessions", "Current active user sessions")

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenVerification(BaseModel):
    token: str

@app.get("/health/live")
def liveness():
    return {"status": "alive", "service": "auth-service"}

@app.get("/health/ready")
def readiness():
    # In production, check Redis session store connectivity
    return {"status": "ready", "redis": "connected", "keys_loaded": True}

@app.get("/metrics")
def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.get("/.well-known/jwks.json")
def jwks():
    """Public JWKS endpoint for asymmetric RS256 token verification"""
    return {
        "keys": [
            {
                "kty": "RSA",
                "use": "sig",
                "kid": "fusion-auth-key-2026",
                "alg": "RS256",
                "n": "uV8pY9z...",
                "e": "AQAB"
            }
        ]
    }

@app.post("/auth/login")
def login(creds: LoginRequest):
    if creds.username == "admin" and creds.password == "fusion2026":
        AUTH_SUCCESS.inc()
        ACTIVE_SESSIONS.inc()
        session_token = f"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.{uuid.uuid4().hex[:16]}"
        return {
            "access_token": session_token,
            "token_type": "bearer",
            "expires_in": 3600,
            "user": {"id": 101, "username": creds.username, "role": "sre-lead"}
        }
    AUTH_FAILURES.inc()
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials"
    )

@app.post("/auth/verify")
def verify_token(req: TokenVerification):
    TOKEN_VERIFICATIONS.inc()
    if req.token.startswith("eyJhbGciOiJSUzI1Ni"):
        return {"valid": True, "subject": "admin", "roles": ["admin", "sre"]}
    return {"valid": False, "reason": "token_expired_or_invalid"}
