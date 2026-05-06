from typing import List, Optional

from pydantic import BaseModel, Field


class SymptomInput(BaseModel):
    description: str
    duration: Optional[str] = None
    severity: Optional[str] = None
    body_part: Optional[str] = None


class EpisodeCreate(BaseModel):
    patient_id: str
    symptoms: List[SymptomInput]
    language: str = "english"
    input_mode: str = "text"  # text, voice, image


class Episode(BaseModel):
    episode_id: str
    patient_id: str
    symptoms: List[SymptomInput] = Field(default_factory=list)
    triage_result: Optional[dict] = None
    decision: Optional[str] = None
    suggestions: Optional[List[str]] = None
    doctor_recommendation: Optional[dict] = None
    prescription_text: Optional[str] = None
    status: str = "active"
    language: str = "english"
    input_mode: str = "text"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
