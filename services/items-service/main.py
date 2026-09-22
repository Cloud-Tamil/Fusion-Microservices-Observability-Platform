import time
import os
import json
from fastapi import FastAPI, Response, HTTPException, Request
from pydantic import BaseModel
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST

app = FastAPI(title="Fusion Items Catalog Service", version="2.5.0")

# Metrics
CACHE_HITS = Counter("fusion_cache_hits_total", "Redis cache hits")
CACHE_MISSES = Counter("fusion_cache_misses_total", "Redis cache misses")
ITEMS_TOTAL = Gauge("fusion_items_count", "Total active catalog items")

class ItemCreate(BaseModel):
    name: str
    description: str
    category: str
    price: float
    stock: int
    sku: str

# In-memory mock with persistent simulation
DATABASE = [
    {
        "id": 1,
        "name": "Titan Pro Compute Engine v3",
        "description": "High-availability cloud server unit with redundant power rails.",
        "category": "Compute",
        "price": 499.0,
        "stock": 142,
        "sku": "FUS-COMP-01",
        "cached": True
    },
    {
        "id": 2,
        "name": "HyperPulse Redis NVMe Accelerator",
        "description": "Sub-millisecond persistent memory tier for distributed state caches.",
        "category": "Storage",
        "price": 1250.0,
        "stock": 35,
        "sku": "FUS-STOR-99",
        "cached": True
    }
]

ITEMS_TOTAL.set(len(DATABASE))

@app.get("/health/live")
def liveness():
    return {"status": "alive", "service": "items-service"}

@app.get("/health/ready")
def readiness():
    return {"status": "ready", "postgres": "ok", "redis": "ok"}

@app.get("/metrics")
def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.get("/items")
def list_items():
    CACHE_HITS.inc()
    return {"items": DATABASE}

@app.post("/items")
def create_item(item: ItemCreate):
    new_id = len(DATABASE) + 1
    new_item = {
        "id": new_id,
        "name": item.name,
        "description": item.description,
        "category": item.category,
        "price": item.price,
        "stock": item.stock,
        "sku": item.sku,
        "cached": False
    }
    DATABASE.append(new_item)
    ITEMS_TOTAL.inc()
    return new_item

@app.delete("/items/{item_id}")
def delete_item(item_id: int):
    global DATABASE
    DATABASE = [i for i in DATABASE if i["id"] != item_id]
    ITEMS_TOTAL.set(len(DATABASE))
    return {"deleted": item_id}
