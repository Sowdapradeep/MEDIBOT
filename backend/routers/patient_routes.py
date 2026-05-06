"""Patient portal routes — all endpoints require patient JWT."""

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, File, Query, UploadFile

from backend.middleware.auth import get_current_user
from backend.models.episode import SymptomInput
from backend.models.patient import PatientUpdate
from backend.orchestrator import run_pipeline, run_prescription_pipeline, run_followup_pipeline
from backend.services.dynamodb import get_item, put_item, query_items, get_table
from backend.services.qr import generate_qr_token
from backend.services.s3 import upload_file
from backend.services.transcribe import transcribe_audio_file
from backend.agents.image_symptom_analysis import analyze_image
from boto3.dynamodb.conditions import Key

router = APIRouter(tags=["patient"])


def _require_patient(user: dict) -> str:
    """Enforce patient portal access and return patient_id."""
    if user["portal"] != "patient":
        raise HTTPException(status_code=403, detail="Patient access only")
    return user["user_id"]


# ---------------------------------------------------------------------------
# Session & Symptoms
# ---------------------------------------------------------------------------


@router.post("/patient/session/start")
async def start_session(user: dict = Depends(get_current_user)):
    """Start a new consultation session and run the orchestrator pipeline."""
    patient_id = _require_patient(user)

    patient_profile = get_item("patients", {"patient_id": patient_id})
    if not patient_profile:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    patient_input = {
        "patient_id": patient_id,
        "session_id": str(uuid.uuid4()),
        "started_at": datetime.now(timezone.utc).isoformat(),
    }

    result = await run_pipeline(patient_input, patient_profile)
    return {"status": "session_started", "data": result}


@router.post("/patient/symptoms")
async def submit_symptoms(
    body: dict,
    user: dict = Depends(get_current_user),
):
    """Submit symptoms (text input) and trigger the consultation pipeline."""
    patient_id = _require_patient(user)

    patient_profile = get_item("patients", {"patient_id": patient_id})
    if not patient_profile:
        patient_profile = {
            "patient_id": patient_id,
            "name": "Dev Patient",
            "age": 30,
            "gender": "male",
            "language": body.get("language", "english"),
            "known_conditions": [],
            "current_medicines": [],
            "emergency_contact": "",
        }

    patient_input = {
        "patient_id": patient_id,
        "text": body.get("symptoms", ""),
        "input_method": "text",
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }

    result = await run_pipeline(patient_input, patient_profile)
    return {"status": "pipeline_complete", "data": result}


# ---------------------------------------------------------------------------
# Image Symptom Analysis
# ---------------------------------------------------------------------------


@router.post("/patient/symptoms/image")
async def analyze_symptom_image(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """Upload a photo of symptoms (rash, wound, swelling) for AI visual analysis."""
    patient_id = _require_patient(user)

    patient_profile = get_item("patients", {"patient_id": patient_id})
    if not patient_profile:
        patient_profile = {
            "patient_id": patient_id,
            "name": "Dev Patient",
            "age": 30,
            "gender": "male",
            "language": "english",
            "known_conditions": [],
            "current_medicines": [],
        }

    image_bytes = await file.read()
    content_type = file.content_type or "image/jpeg"

    result = await analyze_image(image_bytes, content_type, patient_profile)
    return {"status": "analysis_complete", "data": result}


# ---------------------------------------------------------------------------
# Episodes
# ---------------------------------------------------------------------------


@router.get("/patient/episodes/{episode_id}")
async def get_episode(episode_id: str, user: dict = Depends(get_current_user)):
    """Get a single episode — must belong to the authenticated patient."""
    patient_id = _require_patient(user)

    episode = get_item("episodes", {"episode_id": episode_id})
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    if episode.get("patient_id") != patient_id:
        raise HTTPException(status_code=403, detail="Access denied — episode does not belong to you")

    return episode


@router.get("/patient/episodes")
async def list_episodes(user: dict = Depends(get_current_user)):
    """List all episodes belonging to the authenticated patient."""
    patient_id = _require_patient(user)

    episodes = query_items(
        "episodes",
        Key("patient_id").eq(patient_id),
        index_name="patient_id-index",
    )
    return {"episodes": episodes}


# ---------------------------------------------------------------------------
# Voice Transcription
# ---------------------------------------------------------------------------


@router.post("/patient/voice/transcribe")
async def transcribe_voice(
    file: UploadFile = File(...),
    language: str = Query(default="english"),
    user: dict = Depends(get_current_user),
):
    """Upload audio file, transcribe via Transcribe service, return job name."""
    patient_id = _require_patient(user)

    contents = await file.read()
    s3_key = f"voice/{patient_id}/{uuid.uuid4()}.wav"

    upload_file("reports", s3_key, contents, "audio/wav", metadata={"patient_id": patient_id})

    job_name = transcribe_audio_file("medibot-reports-prod", s3_key, language)
    return {"status": "transcription_started", "job_name": job_name}


# ---------------------------------------------------------------------------
# Prescription Upload
# ---------------------------------------------------------------------------


@router.post("/patient/prescription/upload")
async def upload_prescription(
    file: UploadFile = File(...),
    episode_id: str = Query(...),
    user: dict = Depends(get_current_user),
):
    """Upload prescription image and run the prescription pipeline."""
    patient_id = _require_patient(user)

    # Verify episode belongs to patient
    episode = get_item("episodes", {"episode_id": episode_id})
    if not episode or episode.get("patient_id") != patient_id:
        raise HTTPException(status_code=403, detail="Episode does not belong to you")

    image_bytes = await file.read()

    # Upload to S3
    s3_key = f"episodes/{episode_id}/prescription.jpg"
    upload_file(
        "prescriptions",
        s3_key,
        image_bytes,
        file.content_type or "image/jpeg",
        metadata={"episode_id": episode_id},
    )

    result = await run_prescription_pipeline(image_bytes, episode_id, patient_id)
    return {"status": "prescription_parsed", "data": result}


# ---------------------------------------------------------------------------
# Nearby Doctors
# ---------------------------------------------------------------------------


@router.get("/patient/doctors/nearby")
async def get_nearby_doctors(
    lat: float = Query(...),
    lng: float = Query(...),
    specialty: Optional[str] = Query(default=None),
    user: dict = Depends(get_current_user),
):
    """Query nearby doctors by location and optional specialty."""
    _require_patient(user)

    # Query doctors table — filter by specialty if provided
    doctors = query_items(
        "doctors",
        Key("is_active").eq(True),
        index_name="active-doctors-index",
    )

    # Filter by specialty if provided
    if specialty:
        doctors = [d for d in doctors if d.get("specialization", "").lower() == specialty.lower()]

    return {"doctors": doctors, "lat": lat, "lng": lng}


# ---------------------------------------------------------------------------
# Appointments
# ---------------------------------------------------------------------------


@router.post("/patient/appointments/book")
async def book_appointment(
    doctor_id: str = Query(...),
    date: str = Query(...),
    time_slot: str = Query(...),
    episode_id: Optional[str] = Query(default=None),
    reason: Optional[str] = Query(default=None),
    user: dict = Depends(get_current_user),
):
    """Book an appointment with a doctor."""
    patient_id = _require_patient(user)

    appointment_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    appointment = {
        "appointment_id": appointment_id,
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "episode_id": episode_id or "",
        "date": date,
        "time_slot": time_slot,
        "reason": reason or "",
        "appointment_type": "in_person",
        "status": "scheduled",
        "created_at": now,
        "updated_at": now,
    }

    put_item("appointments", appointment, condition="attribute_not_exists(appointment_id)")
    return {"status": "booked", "appointment": appointment}


@router.get("/patient/appointments")
async def list_appointments(user: dict = Depends(get_current_user)):
    """List all appointments for the authenticated patient."""
    patient_id = _require_patient(user)

    appointments = query_items(
        "appointments",
        Key("patient_id").eq(patient_id),
        index_name="patient_id-index",
    )
    return {"appointments": appointments}


# ---------------------------------------------------------------------------
# QR Code Generation
# ---------------------------------------------------------------------------


@router.get("/patient/qr/generate/{episode_id}")
async def generate_qr(episode_id: str, user: dict = Depends(get_current_user)):
    """Generate a QR token for an episode — must belong to the patient."""
    patient_id = _require_patient(user)

    episode = get_item("episodes", {"episode_id": episode_id})
    if not episode or episode.get("patient_id") != patient_id:
        raise HTTPException(status_code=403, detail="Episode does not belong to you")

    qr_url = generate_qr_token(episode_id, patient_id)
    return {"qr_url": qr_url, "episode_id": episode_id}


# ---------------------------------------------------------------------------
# Follow-Up Check-In
# ---------------------------------------------------------------------------


@router.post("/patient/followup/checkin")
async def followup_checkin(
    response_data: dict,
    episode_id: str = Query(...),
    user: dict = Depends(get_current_user),
):
    """Submit daily follow-up response and run the follow-up pipeline."""
    patient_id = _require_patient(user)

    # Verify episode belongs to patient
    episode = get_item("episodes", {"episode_id": episode_id})
    if not episode or episode.get("patient_id") != patient_id:
        raise HTTPException(status_code=403, detail="Episode does not belong to you")

    result = await run_followup_pipeline(response_data, episode_id, patient_id)
    return {"status": "followup_processed", "data": result}


# ---------------------------------------------------------------------------
# Records Timeline
# ---------------------------------------------------------------------------


@router.get("/patient/records/timeline")
async def get_timeline(user: dict = Depends(get_current_user)):
    """Get all episodes as a timeline for the patient."""
    patient_id = _require_patient(user)

    episodes = query_items(
        "episodes",
        Key("patient_id").eq(patient_id),
        index_name="patient_id-index",
    )

    # Sort by created_at descending
    episodes.sort(key=lambda e: e.get("created_at", ""), reverse=True)
    return {"timeline": episodes}


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------


@router.get("/patient/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    """Get the authenticated patient's profile."""
    patient_id = _require_patient(user)

    profile = get_item("patients", {"patient_id": patient_id})
    if not profile:
        # Return a default profile in dev mode
        profile = {
            "patient_id": patient_id,
            "name": "Dev Patient",
            "phone": "+91-9876543210",
            "age": 30,
            "gender": "male",
            "language": "english",
            "known_conditions": [],
            "allergies": [],
            "current_medicines": [],
            "emergency_contact": "+91-9876543211",
        }

    return profile


@router.put("/patient/profile")
async def update_profile(
    updates: PatientUpdate,
    user: dict = Depends(get_current_user),
):
    """Update the authenticated patient's profile."""
    patient_id = _require_patient(user)

    profile = get_item("patients", {"patient_id": patient_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    # Merge updates into existing profile
    update_data = updates.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    profile.update(update_data)
    profile["updated_at"] = datetime.now(timezone.utc).isoformat()

    put_item("patients", profile)
    return {"status": "updated", "profile": profile}
