from typing import Optional

from pydantic import BaseModel


class AppointmentCreate(BaseModel):
    patient_id: str
    doctor_id: str
    episode_id: Optional[str] = None
    date: str
    time_slot: str
    reason: Optional[str] = None
    appointment_type: str = "in_person"  # in_person, teleconsult


class AppointmentUpdate(BaseModel):
    date: Optional[str] = None
    time_slot: Optional[str] = None
    status: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None


class Appointment(BaseModel):
    appointment_id: str
    patient_id: str
    doctor_id: str
    episode_id: Optional[str] = None
    date: str
    time_slot: str
    reason: Optional[str] = None
    appointment_type: str = "in_person"
    status: str = "scheduled"  # scheduled, completed, cancelled, no_show
    notes: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
