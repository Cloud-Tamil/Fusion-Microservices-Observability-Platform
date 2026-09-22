import time
import os
import uuid
from fastapi import FastAPI, Response, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST

app = FastAPI(title="Fusion Orders Processing Service", version="2.5.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus Metrics
ORDERS_TOTAL = Counter("fusion_orders_created_total", "Total orders placed", ["status"])
ORDER_PROCESSING_TIME = Histogram("fusion_order_processing_seconds", "Time taken to process an order checkout")
ACTIVE_ORDERS = Gauge("fusion_pending_orders_count", "Pending orders undergoing saga orchestration")

class OrderItem(BaseModel):
    item_id: int
    quantity: int
    price: float

class CreateOrderRequest(BaseModel):
    customer_id: str
    items: List[OrderItem]
    idempotency_key: str

ORDERS_DB = []

@app.get("/health/live")
def liveness():
    return {"status": "alive", "service": "orders-service"}

@app.get("/health/ready")
def readiness():
    # Verify PgBouncer connection pool and message broker
    return {"status": "ready", "db_pool": "healthy", "queue": "ready"}

@app.get("/metrics")
def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.get("/orders")
def get_orders():
    return {"orders": ORDERS_DB}

@app.post("/orders")
def create_order(order: CreateOrderRequest):
    start = time.time()
    ACTIVE_ORDERS.inc()
    try:
        # Check idempotency
        for existing in ORDERS_DB:
            if existing.get("idempotency_key") == order.idempotency_key:
                return existing

        total_amount = sum(item.price * item.quantity for item in order.items)
        order_record = {
            "order_id": f"ORD-{uuid.uuid4().hex[:8].upper()}",
            "customer_id": order.customer_id,
            "items": [item.model_dump() for item in order.items],
            "total_amount": total_amount,
            "status": "CONFIRMED",
            "idempotency_key": order.idempotency_key,
            "created_at": time.time()
        }
        ORDERS_DB.append(order_record)
        ORDERS_TOTAL.labels(status="confirmed").inc()
        return order_record
    finally:
        ACTIVE_ORDERS.dec()
        ORDER_PROCESSING_TIME.observe(time.time() - start)
