"""Booking Agent - smart scheduler for doctor appointments."""

import json

from boto3.dynamodb.conditions import Key

from backend.services.bedrock import invoke_agent, MODEL_SONNET, MODEL_HAIKU
from backend.services.dynamodb import get_table, query_items

SYSTEM_PROMPT = """You are the Booking Agent for MediBot - a smart appointment scheduler.

Ranking criteria for doctor selection:
1. Specialty match (must match primary or secondary specialty)
2. Distance from patient (closer is better)
3. Earliest available slot within urgency window
4. Doctor rating
5. Language match with patient

Urgency windows:
- CRITICAL = within 1 hour
- HIGH = same day
- MEDIUM = within 24 hours
- LOW = within 48-72 hours

If urgency cannot be met with available doctors, set needs_emergency_redirect to true.

Respond ONLY with valid JSON in this format:
{
  "recommended_booking": {
    "doctor_id": "<selected doctor id>",
    "doctor_name": "<doctor name>",
    "specialty": "<specialty>",
    "slot_time": "<ISO datetime of recommended slot>",
    "clinic_name": "<clinic or hospital name>",
    "distance_km": <distance in km>
  },
  "alternatives": [{"doctor_id": "<id>", "doctor_name": "<name>", "slot_time": "<time>"}],
  "needs_emergency_redirect": <true or false>,
  "booking_urgency_met": <true or false>,
  "confirmation_message": "<message for patient>",
  "preparation_instructions": ["<instruction1>", "<instruction2>"]
}"""

USER_TEMPLATE = """Primary Specialty: {primary_specialty}
Severity: {severity}
Urgency Hours: {urgency_hours}
Patient Location (lat, lng): {lat}, {lng}
Detected Language: {detected_language}
Available Doctors: {available_doctors_json}
Episode ID: {episode_id}"""


async def run(doctor_rec_output: dict, decision_output: dict, patient_profile: dict) -> dict:
    """Find available doctors and book the best match."""
    # Query doctors table for available doctors near the patient
    primary_specialty = doctor_rec_output.get("primary_specialty", "General Physician")
    available_doctors = _get_available_doctors(primary_specialty)

    user_message = USER_TEMPLATE.format(
        primary_specialty=primary_specialty,
        severity=decision_output.get("severity", "MEDIUM"),
        urgency_hours=decision_output.get("urgency_hours", 24),
        lat=patient_profile.get("lat", 0),
        lng=patient_profile.get("lng", 0),
        detected_language=patient_profile.get("language", "english"),
        available_doctors_json=json.dumps(available_doctors),
        episode_id=patient_profile.get("episode_id", ""),
    )

    return invoke_agent(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_message,
        model_id=MODEL_HAIKU,
        max_tokens=500,
    )


def _get_available_doctors(specialty: str) -> list:
    """Query the doctors table for available doctors matching the specialty."""
    try:
        table = get_table("doctors")
        response = table.query(
            IndexName="specialty-index",
            KeyConditionExpression=Key("specialty").eq(specialty),
            ProjectionExpression="#n, #did, #spec, #loc, #rating, #lang, #slots",
            ExpressionAttributeNames={
                "#n": "name",
                "#did": "doctor_id",
                "#spec": "specialty",
                "#loc": "location",
                "#rating": "rating",
                "#lang": "languages",
                "#slots": "available_slots",
            },
        )
        return response.get("Items", [])
    except Exception:
        return []  # DynamoDB unavailable in dev mode
