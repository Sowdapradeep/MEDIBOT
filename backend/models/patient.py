from typing import List, Optional

from pydantic import BaseModel, Field


class PatientProfile(BaseModel):
    patient_id: str
    name: str
    phone: str
    age: int
    gender: str
    language: str = "english"
    blood_group: Optional[str] = None
    allergies: List[str] = Field(default_factory=list)
    chronic_conditions: List[str] = Field(default_factory=list)
    emergency_contact: Optional[str] = None
    address: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class PatientCreate(BaseModel):
    name: str
    phone: str
    age: int
    gender: str
    language: str = "english"
    blood_group: Optional[str] = None
    allergies: List[str] = Field(default_factory=list)
    chronic_conditions: List[str] = Field(default_factory=list)
    emergency_contact: Optional[str] = None
    address: Optional[str] = None


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    language: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[List[str]] = None
    chronic_conditions: Optional[List[str]] = None
    emergency_contact: Optional[str] = None
    address: Optional[str] = None
