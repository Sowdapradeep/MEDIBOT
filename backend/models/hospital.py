from typing import List, Optional

from pydantic import BaseModel, Field


class HospitalCreate(BaseModel):
    name: str
    address: str
    phone: str
    city: str
    state: str = "Tamil Nadu"
    pincode: str
    specializations: List[str] = Field(default_factory=list)
    emergency_available: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class HospitalUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    specializations: Optional[List[str]] = None
    emergency_available: Optional[bool] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_active: Optional[bool] = None


class Hospital(BaseModel):
    hospital_id: str
    name: str
    address: str
    phone: str
    city: str
    state: str = "Tamil Nadu"
    pincode: str
    specializations: List[str] = Field(default_factory=list)
    emergency_available: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_active: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
