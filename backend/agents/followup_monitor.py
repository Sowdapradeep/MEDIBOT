"""Follow-Up Monitor Agent - daily recovery tracker."""

import json
import uuid
from datetime import datetime, timezone

from backend.services.bedrock import invoke_agent, MODEL_SONNET, MODEL_HAIKU
from backend.services.dynamodb import put_item, get_item, query_items, get_table, batch_write
from boto3.dynamodb.conditions import Key

SYSTEM_PROMPT = """You are the Follow-Up Monitor Agent for MediBot - a daily recovery tracker.

Recovery statuses: IMPROVING | STABLE | DETERIORATING | NOT_ADHERING | CURED

Escalation triggers (set escalate_to_emergency = true):
- Patient reports chest pain
- Patient reports breathing difficulty
- Patient says "much worse" and original severity was HIGH
- No response for 3 days and original severity was HIGH

Respond ONLY with valid JSON in this format:
{
  "recovery_status": "<IMPROVING|STABLE|DETERIORATING|NOT_ADHERING|CURED>",
  "medicine_adherence_percent": <0-100>,
  "symptom_trend": "<improving|stable|worsening>",
  "pain_score_today": <0-10 or null if not reported>,
  "action_required": "<what to do next>",
  "escalate_to_emergency": <true or false>,
  "patient_message": "<warm message to patient in their language>",
  "next_checkin_questions": ["<question1>", "<question2>"],
  "days_since_start": <number>,
  "estimated_recovery_days_remaining": <number or null>,
  "episode_close_recommended": <true or false>
}"""

USER_TEMPLATE = """Patient Response: {patient_response}
Episode Data: {episode_json}
Medicine Schedule: {medicine_schedule_json}
Follow-Up History: {followup_history_json}
Days Since Start: {days_since_start}
Original Severity: {original_severity}
Detected Language: {detected_language}"""


async def initialize(parsed_prescription: dict, episode_id: str, patient_id: str) -> None:
    """Store medicine schedule from parsed prescription for follow-up tracking."""
    now = datetime.now(timezone.utc).isoformat()
    medicines = parsed_prescription.get("medicines", [])

    # Store each medicine as a schedule item
    schedule_items = []
    for med in medicines:
        schedule_items.append({
            "medicine_id": str(uuid.uuid4()),
            "episode_id": episode_id,
            "patient_id": patient_id,
            "medicine_name": med.get("name", ""),
            "dosage": med.get("dosage", ""),
            "frequency": med.get("frequency", ""),
            "timing": med.get("timing", ""),
            "reminder_times": med.get("reminder_times", []),
            "duration_days": med.get("duration_days", 0),
            "created_at": now,
            "status": "active",
        })

    if schedule_items:
        batch_write("medicines", schedule_items)


async def run(patient_response: dict, episode_id: str, patient_id: str) -> dict:
    """Process patient follow-up response and assess recovery."""
    # Fetch episode data
    episode = get_item("episodes", {"episode_id": episode_id})

    # Fetch medicine schedule
    medicine_schedule = query_items(
        "medicines",
        Key("episode_id").eq(episode_id),
        index_name="episode-index",
    )

    # Fetch follow-up history
    followup_history = query_items(
        "followups",
        Key("episode_id").eq(episode_id),
        index_name="episode-index",
    )

    # Calculate days since episode start
    created_at = episode.get("created_at", datetime.now(timezone.utc).isoformat()) if episode else datetime.now(timezone.utc).isoformat()
    start_date = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    days_since_start = (datetime.now(timezone.utc) - start_date).days

    # Get original severity from decision output
    decision_output = episode.get("decision_output", {}) if episode else {}
    original_severity = decision_output.get("severity", "MEDIUM")

    # Detected language from triage
    triage_output = episode.get("triage_output", {}) if episode else {}
    detected_language = triage_output.get("detected_language", "english")

    user_message = USER_TEMPLATE.format(
        patient_response=json.dumps(patient_response),
        episode_json=json.dumps(episode or {}),
        medicine_schedule_json=json.dumps(medicine_schedule),
        followup_history_json=json.dumps(followup_history[-10:]),
        days_since_start=days_since_start,
        original_severity=original_severity,
        detected_language=detected_language,
    )

    result = invoke_agent(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_message,
        model_id=MODEL_HAIKU,
        max_tokens=600,
    )

    # Store follow-up record
    followup_item = {
        "followup_id": str(uuid.uuid4()),
        "episode_id": episode_id,
        "patient_id": patient_id,
        "patient_response": patient_response,
        "agent_output": result,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    put_item("followups", followup_item, condition="attribute_not_exists(followup_id)")

    return result
