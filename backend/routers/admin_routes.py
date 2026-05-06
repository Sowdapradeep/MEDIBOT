"""Admin portal routes — all endpoints require admin JWT.

Admin can ONLY manage their own hospital_id.
Admin CANNOT access patient health data.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.middleware.auth import get_current_user
from backend.models.doctor import DoctorCreate
from backend.models.hospital import HospitalUpdate
from backend.services.dynamodb import get_item, put_item, query_items, get_table
from boto3.dynamodb.conditions import Key

router = APIRouter(tags=["admin"])


def _require_admin(user: dict) -> str:
    """Enforce admin portal access and return admin user_id."""
    if user["portal"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access only")
    return user["user_id"]


def _get_admin_hospital_id(admin_id: str) -> str:
    """Retrieve the hospital_id associated with this admin."""
    # Admin profile stores their hospital_id
    admin_profile = get_item("hospitals", {"hospital_id": admin_id})
    if not admin_profile:
        # Fallback: admin_id IS the hospital_id
        return admin_id
    return admin_profile.get("hospital_id", admin_id)


def _verify_hospital_ownership(admin_id: str, doctor: dict) -> None:
    """Verify that a doctor belongs to the admin's hospital."""
    hospital_id = _get_admin_hospital_id(admin_id)
    if doctor.get("hospital_id") != hospital_id:
        raise HTTPException(
            status_code=403,
            detail="Doctor does not belong to your hospital",
        )


# ---------------------------------------------------------------------------
# Doctor Management
# ---------------------------------------------------------------------------


@router.post("/admin/doctors/add")
async def add_doctor(
    doctor_data: DoctorCreate,
    user: dict = Depends(get_current_user),
):
    """Add a new doctor to the admin's hospital."""
    admin_id = _require_admin(user)
    hospital_id = _get_admin_hospital_id(admin_id)

    doctor_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    doctor_item = {
        "doctor_id": doctor_id,
        "name": doctor_data.name,
        "phone": doctor_data.phone,
        "specialization": doctor_data.specialization,
        "hospital_id": hospital_id,
        "qualifications": doctor_data.qualifications,
        "experience_years": doctor_data.experience_years,
        "languages": doctor_data.languages,
        "availability": [a.model_dump() for a in doctor_data.availability],
        "consultation_fee": doctor_data.consultation_fee,
        "is_active": True,
        "is_verified": False,
        "created_at": now,
        "updated_at": now,
    }

    put_item("doctors", doctor_item, condition="attribute_not_exists(doctor_id)")
    return {"status": "doctor_added", "doctor_id": doctor_id, "doctor": doctor_item}


@router.get("/admin/doctors")
async def list_doctors(user: dict = Depends(get_current_user)):
    """List all doctors in the admin's hospital."""
    admin_id = _require_admin(user)
    hospital_id = _get_admin_hospital_id(admin_id)

    doctors = query_items(
        "doctors",
        Key("hospital_id").eq(hospital_id),
        index_name="hospital_id-index",
    )
    return {"doctors": doctors}


@router.put("/admin/doctors/{doctor_id}/verify")
async def verify_doctor(doctor_id: str, user: dict = Depends(get_current_user)):
    """Verify a doctor's credentials."""
    admin_id = _require_admin(user)

    doctor = get_item("doctors", {"doctor_id": doctor_id})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    _verify_hospital_ownership(admin_id, doctor)

    doctor["is_verified"] = True
    doctor["verified_by"] = admin_id
    doctor["verified_at"] = datetime.now(timezone.utc).isoformat()
    doctor["updated_at"] = datetime.now(timezone.utc).isoformat()

    put_item("doctors", doctor)
    return {"status": "doctor_verified", "doctor_id": doctor_id}


@router.delete("/admin/doctors/{doctor_id}/deactivate")
async def deactivate_doctor(doctor_id: str, user: dict = Depends(get_current_user)):
    """Deactivate a doctor — soft delete."""
    admin_id = _require_admin(user)

    doctor = get_item("doctors", {"doctor_id": doctor_id})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    _verify_hospital_ownership(admin_id, doctor)

    doctor["is_active"] = False
    doctor["deactivated_by"] = admin_id
    doctor["deactivated_at"] = datetime.now(timezone.utc).isoformat()
    doctor["updated_at"] = datetime.now(timezone.utc).isoformat()

    put_item("doctors", doctor)
    return {"status": "doctor_deactivated", "doctor_id": doctor_id}


# ---------------------------------------------------------------------------
# Hospital Statistics
# ---------------------------------------------------------------------------


@router.get("/admin/hospital/stats")
async def get_hospital_stats(user: dict = Depends(get_current_user)):
    """Get hospital statistics — appointment counts, doctor counts."""
    admin_id = _require_admin(user)
    hospital_id = _get_admin_hospital_id(admin_id)

    # Count doctors
    doctors = query_items(
        "doctors",
        Key("hospital_id").eq(hospital_id),
        index_name="hospital_id-index",
        projection="doctor_id, is_active, is_verified",
    )

    active_doctors = [d for d in doctors if d.get("is_active")]
    verified_doctors = [d for d in doctors if d.get("is_verified")]

    # Count appointments for all doctors in this hospital
    doctor_ids = [d["doctor_id"] for d in doctors]
    total_appointments = 0
    scheduled_appointments = 0

    for did in doctor_ids:
        appts = query_items(
            "appointments",
            Key("doctor_id").eq(did),
            index_name="doctor_id-index",
            projection="appointment_id, status",
        )
        total_appointments += len(appts)
        scheduled_appointments += len([a for a in appts if a.get("status") == "scheduled"])

    return {
        "hospital_id": hospital_id,
        "total_doctors": len(doctors),
        "active_doctors": len(active_doctors),
        "verified_doctors": len(verified_doctors),
        "total_appointments": total_appointments,
        "scheduled_appointments": scheduled_appointments,
    }


# ---------------------------------------------------------------------------
# Hospital Appointments
# ---------------------------------------------------------------------------


@router.get("/admin/hospital/appointments")
async def list_hospital_appointments(
    status: Optional[str] = Query(default=None),
    user: dict = Depends(get_current_user),
):
    """List all appointments at the admin's hospital."""
    admin_id = _require_admin(user)
    hospital_id = _get_admin_hospital_id(admin_id)

    # Get all doctors in hospital
    doctors = query_items(
        "doctors",
        Key("hospital_id").eq(hospital_id),
        index_name="hospital_id-index",
        projection="doctor_id",
    )
    doctor_ids = [d["doctor_id"] for d in doctors]

    all_appointments = []
    for did in doctor_ids:
        appts = query_items(
            "appointments",
            Key("doctor_id").eq(did),
            index_name="doctor_id-index",
        )
        all_appointments.extend(appts)

    if status:
        all_appointments = [a for a in all_appointments if a.get("status") == status]

    return {"appointments": all_appointments}


# ---------------------------------------------------------------------------
# Hospital Alerts
# ---------------------------------------------------------------------------


@router.get("/admin/hospital/alerts")
async def get_hospital_alerts(user: dict = Depends(get_current_user)):
    """Get hospital-level alerts — escalations across all hospital doctors."""
    admin_id = _require_admin(user)
    hospital_id = _get_admin_hospital_id(admin_id)

    # Get all doctors in hospital
    doctors = query_items(
        "doctors",
        Key("hospital_id").eq(hospital_id),
        index_name="hospital_id-index",
        projection="doctor_id",
    )
    doctor_ids = [d["doctor_id"] for d in doctors]

    # Collect appointments to find episode_ids
    episode_ids = set()
    for did in doctor_ids:
        appts = query_items(
            "appointments",
            Key("doctor_id").eq(did),
            index_name="doctor_id-index",
            projection="episode_id",
        )
        for a in appts:
            if a.get("episode_id"):
                episode_ids.add(a["episode_id"])

    # Check follow-ups for escalations
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
# Hospital Profile
# ---------------------------------------------------------------------------


@router.put("/admin/hospital/profile")
async def update_hospital_profile(
    updates: HospitalUpdate,
    user: dict = Depends(get_current_user),
):
    """Update the hospital profile."""
    admin_id = _require_admin(user)
    hospital_id = _get_admin_hospital_id(admin_id)

    hospital = get_item("hospitals", {"hospital_id": hospital_id})
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")

    update_data = updates.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    hospital.update(update_data)
    hospital["updated_at"] = datetime.now(timezone.utc).isoformat()

    put_item("hospitals", hospital)
    return {"status": "updated", "hospital": hospital}


# ---------------------------------------------------------------------------
# Notification Settings
# ---------------------------------------------------------------------------


@router.put("/admin/settings/notifications")
async def update_notification_settings(
    settings: dict,
    user: dict = Depends(get_current_user),
):
    """Update notification settings for the hospital."""
    admin_id = _require_admin(user)
    hospital_id = _get_admin_hospital_id(admin_id)

    hospital = get_item("hospitals", {"hospital_id": hospital_id})
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")

    hospital["notification_settings"] = settings
    hospital["updated_at"] = datetime.now(timezone.utc).isoformat()

    put_item("hospitals", hospital)
    return {"status": "notification_settings_updated", "settings": settings}
