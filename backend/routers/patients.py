"""Patient-related API routes."""

from fastapi import APIRouter

router = APIRouter(prefix="/patients", tags=["patients"])
