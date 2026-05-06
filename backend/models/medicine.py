from typing import Optional

from pydantic import BaseModel


class MedicineCreate(BaseModel):
    episode_id: str
    patient_id: str
    name: str
    dosage: str
    frequency: str
    duration: str
    instructions: Optional[str] = None
    prescribed_by: Optional[str] = None


class Medicine(BaseModel):
    medicine_id: str
    episode_id: str
    patient_id: str
    name: str
    dosage: str
    frequency: str
    duration: str
    instructions: Optional[str] = None
    prescribed_by: Optional[str] = None
    status: str = "active"  # active, completed, discontinued
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
