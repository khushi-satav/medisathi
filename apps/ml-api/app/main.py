"""
MediSathi ML API
================
FastAPI application entry point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.api.scan import router as scan_router
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)

app = FastAPI(
    title="MediSathi ML API",
    version="1.0.0",
    description="Behavioral predictions and healthcare AI inferences for MediSathi.",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow the Express backend and frontend to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(scan_router)


@app.get("/", tags=["Root"])
async def root():
    return {"message": "MediSathi ML API is running", "docs": "/docs"}
