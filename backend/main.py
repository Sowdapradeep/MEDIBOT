"""MediBot API - FastAPI application entry point."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers.patient_routes import router as patient_router
from backend.routers.doctor_routes import router as doctor_router
from backend.routers.admin_routes import router as admin_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="MediBot API",
    description="AI-powered healthcare assistant for Indian patients",
    version="1.0.0",
)

# CORS middleware - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with /api/v1 prefix
app.include_router(patient_router, prefix="/api/v1")
app.include_router(doctor_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "medibot-api"}


@app.on_event("startup")
async def startup_event():
    """Log startup message."""
    logger.info("MediBot API started")
