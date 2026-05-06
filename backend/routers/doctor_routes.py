"""Doctor portal routes — all endpoints require doctor JWT.

CRITICAL: Doctor can ONLY access patient data after a valid QR scan.
Always check qr_tokens table first before exposing patient records.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.middleware.auth import get_current_user
from backend.models.doctor import DoctorAvailability, DoctorUpdate
from backend.models.medicine import MedicineCreate
from backend.services.dynamodb import get_item, put_item, query_items, get_table
from backend.services.qr import scan_qr_token
from boto3.dynamodb.conditions import Key

router = APIRouter(tags=["doctor"])


def _require_doctor(user: dict) -> str:
    """Enforce doctor portal access and return doctor_id."""
    if user["portal"] != "doctor":
        raise HTTPException(status_code=403, detail="Doctor access only")
    return user["user_id"]


def _verify_qr_access(doctor_id: str, episode_id: str) -> None:
    """Verify that the doctor has a valid scanned QR token for this episode.

    Checks the qr_tokens table for a used token matching the episode_id.
    This ensures the doctor physically scanned the patient's QR code.
    """
    table = get_table("qr_tokens")
    # Query for tokens matching this episode that have been used
    response = table.scan(
        FilterExpression="episode_id = :eid AND used = :u",
        ExpressionAttributeValues={":eid": episode_id, ":u": True},
    )
    items = response.get("Items", [])
    if not items:
        raise HTTPException(
            status_code=403,
            detail="Access denied — you must scan the patient's QR code first",
        )


# ---------------------------------------------------------------------------
# QR Scan
# ---------------------------------------------------------------------------


@router.post("/doctor/qr/scan/{token}")
async def scan_qr(token: str, user: dict = Depends(get_current_user)):
    """Scan a QR token, validate (expiry + single-use), return episode and patient info."""
    _require_doctor(user)

    try:
        result = scan_qr_token(token)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "status": "qr_valid",
        "episode_id": result["episode_id"],
        "patient_id": result["patient_id"],
    }


# ---------------------------------------------------------------------------
# Patient Record Access (QR-gated)
# ---------------------------------------------------------------------------


@router.get("/doctor/patient/record/{episode_id}")
async def get_patient_record(episode_id: str, user: dict = Depends(get_current_user)):
    """Get patient record for an episode — MUST have valid scanned QR for this episode."""
    doctor_id = _require_doctor(user)

    # Enforce QR access
    _verify_qr_access(doctor_id, episode_id)

    episode = get_item("episodes", {"episode_id": episode_id})
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")

    # Fetch patient profile (limited fields for doctor view)
    patient_id = episode.get("patient_id")
    patient = get_item(
        "patients",
        {"patient_id": patient_id},
        projection="patient_id, name, age, gender, blood_group, allergies, chronic_conditions",
    )

    return {"episode": episode, "patient": patient}


# ---------------------------------------------------------------------------
# Doctor Notes
# ---------------------------------------------------------------------------


@router.post("/doctor/notes/{episode_id}")
async def add_notes(
    episode_id: str,
    notes: dict,
    user: dict = Depends(get_current_user),
):
    """Add doctor notes to an episode — requires QR access."""
    doctor_id = _require_doctor(user)

    # Enforce QR access
    _verify_qr_access(doctor_id, episode_id)

    note_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    note_item = {
        "note_id": note_id,
        "episode_id": episode_id,
        "doctor_id": doctor_id,
        "content": notes.get("content", ""),
        "diagnosis": notes.get("diagnosis", ""),
        "recommendations": notes.get("recommendations", ""),
        "created_at": now,
    }

    put_item("doctor_notes", note_item, condition="attribute_not_exists(note_id)")
    return {"status": "note_added", "note_id": note_id}


# ---------------------------------------------------------------------------
# Appointments
# ---------------------------------------------------------------------------


@router.get("/doctor/appointments")
async def list_appointments(
    status: Optional[str] = Query(default=None),
    user: dict = Depends(get_current_user),
):
    """List the doctor's appointments, optionally filtered by status."""
    doctor_id = _require_doctor(user)

    appointments = query_items(
        "appointments",
        Key("doctor_id").eq(doctor_id),
        index_name="doctor_id-index",
    )

    if status:
        appointments = [a for a in appointments if a.get("status") == status]

    return {"appointments": appointments}


# ---------------------------------------------------------------------------
# Availability
# ---------------------------------------------------------------------------


@router.put("/doctor/availability")
async def update_availability(
    slots: list[DoctorAvailability],
    user: dict = Depends(get_current_user),
):
    """Update the doctor's available time slots."""
    doctor_id = _require_doctor(user)

    doctor = get_item("doctors", {"doctor_id": doctor_id})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    doctor["availability"] = [s.model_dump() for s in slots]
    doctor["updated_at"] = datetime.now(timezone.utc).isoformat()

    put_item("doctors", doctor)
    return {"status": "availability_updated", "availability": doctor["availability"]}


# ---------------------------------------------------------------------------
# Prescription Creation
# ---------------------------------------------------------------------------


@router.post("/doctor/prescription/create")
async def create_prescription(
    medicines: list[MedicineCreate],
    user: dict = Depends(get_current_user),
):
    """Create a prescription for a patient — writes to medicines table."""
    doctor_id = _require_doctor(user)

    if not medicines:
        raise HTTPException(status_code=400, detail="At least one medicine is required")

    # Verify QR access for the episode
    episode_id = medicines[0].episode_id
    _verify_qr_access(doctor_id, episode_id)

    now = datetime.now(timezone.utc).isoformat()
    created_medicines = []

    table = get_table("medicines")
    with table.batch_writer() as batch:
        for med in medicines:
            medicine_item = {
                "medicine_id": str(uuid.uuid4()),
                "episode_id": med.episode_id,
                "patient_id": med.patient_id,
                "name": med.name,
                "dosage": med.dosage,
                "frequency": med.frequency,
                "duration": med.duration,
                "instructions": med.instructions or "",
                "prescribed_by": doctor_id,
                "status": "active",
                "created_at": now,
                "updated_at": now,
            }
            batch.put_item(Item=medicine_item)
            created_medicines.append(medicine_item)

    return {"status": "prescription_created", "medicines": created_medicines}


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------


@router.get("/doctor/alerts")
async def get_alerts(user: dict = Depends(get_current_user)):
    """Get doctor's alerts — emergency escalations for their patients."""
    doctor_id = _require_doctor(user)

    # Query appointments to find patient_ids associated with this doctor
    appointments = query_items(
        "appointments",
        Key("doctor_id").eq(doctor_id),
        index_name="doctor_id-index",
        projection="patient_id, episode_id",
    )

    # Collect episode_ids for follow-up alerts
    episode_ids = [a["episode_id"] for a in appointments if a.get("episode_id")]

    alerts = []
    for eid in episode_ids:
        followups = query_items(
            "followups",
            Key("episode_id").eq(eid),
        )
        escalated = [f for f in followups if f.get("escalate_to_emergency")]
        alerts.extend(escalated)

    return {"alerts": alerts}


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------


@router.get("/doctor/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    """Get the authenticated doctor's profile."""
    doctor_id = _require_doctor(user)

    profile = get_item("doctors", {"doctor_id": doctor_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    return profile


@router.put("/doctor/profile")
async def update_profile(
    updates: DoctorUpdate,
    user: dict = Depends(get_current_user),
):
    """Update the authenticated doctor's profile."""
    doctor_id = _require_doctor(user)

    profile = get_item("doctors", {"doctor_id": doctor_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    update_data = updates.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    profile.update(update_data)
    profile["updated_at"] = datetime.now(timezone.utc).isoformat()

    put_item("doctors", profile)
    return {"status": "updated", "profile": profile}
