from typing import List, Optional

from pydantic import BaseModel, Field


class DoctorAvailability(BaseModel):
    day: str
    start_time: str
    end_time: str
    slot_duration_minutes: int = 15


class DoctorProfile(BaseModel):
    doctor_id: str
    name: str
    phone: str
    specialization: str
    hospital_id: Optional[str] = None
    qualifications: List[str] = Field(default_factory=list)
    experience_years: int = 0
    languages: List[str] = Field(default_factory=list)
    availability: List[DoctorAvailability] = Field(default_factory=list)
    consultation_fee: Optional[float] = None
    rating: Optional[float] = None
    is_active: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class DoctorCreate(BaseModel):
    name: str
    phone: str
    specialization: str
    hospital_id: Optional[str] = None
    qualifications: List[str] = Field(default_factory=list)
    experience_years: int = 0
    languages: List[str] = Field(default_factory=list)
    availability: List[DoctorAvailability] = Field(default_factory=list)
    consultation_fee: Optional[float] = None


class DoctorUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    specialization: Optional[str] = None
    hospital_id: Optional[str] = None
    qualifications: Optional[List[str]] = None
    experience_years: Optional[int] = None
    languages: Optional[List[str]] = None
    availability: Optional[List[DoctorAvailability]] = None
    consultation_fee: Optional[float] = None
    rating: Optional[float] = None
    is_active: Optional[bool] = None
