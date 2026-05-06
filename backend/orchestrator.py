"""MediBot Pipeline Orchestrator - coordinates agent execution."""

import asyncio
import logging
import os
import uuid

from backend.agents import triage, decision, suggestion, doctor_recommendation
from backend.agents import appointment_booking, health_record, prescription_parsing
from backend.agents import followup_monitor, emergency_alert

logger = logging.getLogger(__name__)
DEV_MODE = os.environ.get("DEV_MODE", "true").lower() == "true"


def _mock_pipeline_result(patient_input: dict) -> dict:
    """Return mock pipeline result when Bedrock/DynamoDB unavailable in dev mode."""
    symptoms_text = patient_input.get("text", "symptoms not provided")
    return {
        "episode_id": str(uuid.uuid4()),
        "triage": {
            "body_system": "general",
            "possible_condition_category": "needs evaluation",
            "key_symptoms_identified": [symptoms_text],
            "clarifying_questions": [],
            "detected_language": "english",
            "confidence": 0.7,
            "immediate_flag": False,
            "notes": "Dev mode - Bedrock unavailable",
        },
        "decision": {
            "severity": "LOW",
            "urgency_hours": 48,
            "reasoning": "Dev mode mock response",
            "escalate_to_emergency": False,
            "recommended_specialist_type": "General Physician",
            "risk_factors_identified": [],
            "contraindications": [],
        },
        "suggestion": {
            "severity_acknowledged": "LOW",
            "immediate_actions": ["Rest and stay hydrated"],
            "home_care_instructions": [
                "Drink plenty of warm fluids",
                "Take rest for 24 hours",
            ],
            "what_to_avoid": ["Cold drinks", "Heavy exercise"],
            "warning_signs": ["If fever exceeds 103°F, visit a doctor"],
            "otc_suggestions": ["Paracetamol 500mg if fever above 100°F"],
            "reassurance_message": "This looks manageable at home. Rest well and monitor your symptoms.",
            "follow_up_in_hours": 24,
        },
        "doctor_recommendation": {
            "primary_specialty": "General Physician",
            "secondary_specialty": None,
            "rural_fallback": "General Physician at nearest PHC",
            "specialty_reasoning": "General symptoms best evaluated by GP",
            "urgency_context": "Can wait 24-48 hours",
            "search_keywords": ["general physician", "GP", "family doctor"],
            "telemedicine_suitable": True,
            "home_visit_suitable": False,
        },
        "booking": {
            "recommended_booking": None,
            "alternatives": [],
            "needs_emergency_redirect": False,
            "booking_urgency_met": True,
            "confirmation_message": "No booking made in dev mode",
            "preparation_instructions": [],
        },
    }


async def run_pipeline(patient_input: dict, patient_profile: dict) -> dict:
    """Main consultation pipeline: triage → decision → suggestion → booking."""
    try:
        # Step 1: Triage
        logger.info("Running triage agent")
        triage_out = await triage.run(patient_input, patient_profile)

        # Step 2: Decision
        logger.info("Running decision agent")
        decision_out = await decision.run(triage_out, patient_profile)

        # Step 3: Fire emergency watch as background task
        asyncio.create_task(emergency_alert.watch(decision_out, patient_profile))

        # Step 4: Suggestion
        logger.info("Running suggestion agent")
        suggestion_out = await suggestion.run(decision_out, triage_out, patient_profile)

        # Step 5: Doctor recommendation + Health record in parallel
        logger.info("Running doctor_rec and health_record in parallel")
        doctor_rec_out, health_record_out = await asyncio.gather(
            doctor_recommendation.run(decision_out, patient_profile),
            health_record.create_episode(
                patient_input, triage_out, decision_out, patient_profile
            ),
        )

        episode_id = health_record_out.get("episode_id", "")
        patient_profile["episode_id"] = episode_id

        # Step 6: Appointment booking
        logger.info("Running booking agent")
        booking_out = await appointment_booking.run(
            doctor_rec_out, decision_out, patient_profile
        )

        # Step 7: Update episode with booking result
        await health_record.update_episode(episode_id, booking_out)

        return {
            "episode_id": episode_id,
            "triage": triage_out,
            "decision": decision_out,
            "suggestion": suggestion_out,
            "doctor_recommendation": doctor_rec_out,
            "booking": booking_out,
            "health_record": health_record_out,
        }

    except Exception as e:
        if DEV_MODE:
            logger.warning(f"Pipeline failed (dev mode), returning mock: {e}")
            return _mock_pipeline_result(patient_input)
        raise


async def run_prescription_pipeline(
    image_bytes: bytes, episode_id: str, patient_id: str
) -> dict:
    """Prescription parsing pipeline: OCR → parse → initialize follow-up."""
    try:
        logger.info("Running prescription parsing agent")
        parsed = await prescription_parsing.run(image_bytes, episode_id, patient_id)
        await followup_monitor.initialize(parsed, episode_id, patient_id)
        return parsed
    except Exception as e:
        if DEV_MODE:
            logger.warning(f"Prescription pipeline failed (dev mode): {e}")
            return {"medicines": [], "ocr_quality": "unavailable", "needs_pharmacist_review": True}
        raise


async def run_followup_pipeline(
    patient_response: dict, episode_id: str, patient_id: str
) -> dict:
    """Follow-up pipeline: assess recovery → escalate if needed."""
    try:
        logger.info("Running follow-up monitor agent")
        result = await followup_monitor.run(patient_response, episode_id, patient_id)

        if result.get("escalate_to_emergency", False):
            logger.warning("Follow-up triggered emergency escalation")
            await emergency_alert.trigger(
                {**result, "_trigger_source": "followup_monitor"},
                patient_id,
                episode_id,
            )
        return result
    except Exception as e:
        if DEV_MODE:
            logger.warning(f"Follow-up pipeline failed (dev mode): {e}")
            return {
                "recovery_status": "STABLE",
                "medicine_adherence_percent": 0,
                "symptom_trend": "stable",
                "action_required": "continue",
                "escalate_to_emergency": False,
                "patient_message": "Check-in recorded. Service temporarily unavailable.",
                "next_checkin_questions": ["How are you feeling today?"],
            }
        raise
