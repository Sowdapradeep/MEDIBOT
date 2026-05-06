"""Health Record Agent - medical records curator."""

import json
import uuid
from datetime import datetime, timezone

from backend.services.bedrock import invoke_agent, MODEL_SONNET, MODEL_HAIKU
from backend.services.dynamodb import put_item, get_item, query_items, get_table
from boto3.dynamodb.conditions import Key

SYSTEM_PROMPT = """You are the Health Record Agent for MediBot - a medical records curator.

Rules:
- episode_summary: 2-3 sentences in plain language the patient can understand.
- doctor_brief: uses clinical terminology suitable for a doctor reviewing the case.
- pattern_flags: only include if there are 2 or more past episodes with similar symptoms or conditions.
- structured_record: organize key data for storage.

Respond ONLY with valid JSON in this format:
{
  "episode_summary": "<2-3 sentence plain language summary>",
  "doctor_brief": "<clinical terminology summary for doctor>",
  "structured_record": {
    "body_system": "<affected system>",
    "severity": "<severity level>",
    "key_symptoms": ["<symptom1>", "<symptom2>"],
    "recommended_specialist": "<specialist type>",
    "timestamp": "<ISO datetime>"
  },
  "always_show_to_doctor": <true or false>,
  "pattern_flags": ["<pattern if 2+ similar past episodes>"],
  "qr_data_scope": ["<fields to include in QR code for doctor>"]
}"""

USER_TEMPLATE = """Patient ID: {patient_id}
Episode ID: {episode_id}
Triage Output: {triage_output}
Decision Output: {decision_output}
Booking Output: {booking_output}
Past Episodes: {past_episodes_json}
Patient Profile: {patient_profile_json}"""


async def create_episode(patient_input: dict, triage_out: dict, decision_out: dict, patient_profile: dict) -> dict:
    """Create a new episode in DynamoDB and generate health record via Bedrock."""
    episode_id = str(uuid.uuid4())
    patient_id = patient_profile.get("patient_id", "")
    now = datetime.now(timezone.utc).isoformat()

    # Store initial episode in DynamoDB
    episode_item = {
        "episode_id": episode_id,
        "patient_id": patient_id,
        "created_at": now,
        "updated_at": now,
        "status": "active",
        "patient_input": patient_input,
        "triage_output": triage_out,
        "decision_output": decision_out,
    }
    put_item("episodes", episode_item, condition="attribute_not_exists(episode_id)")

    # Fetch past episodes for pattern detection
    past_episodes = query_items(
        "episodes",
        Key("patient_id").eq(patient_id),
        projection="episode_id, triage_output, decision_output, created_at",
        index_name="patient-index",
    )

    # Call Bedrock for health record generation
    user_message = USER_TEMPLATE.format(
        patient_id=patient_id,
        episode_id=episode_id,
        triage_output=json.dumps(triage_out),
        decision_output=json.dumps(decision_out),
        booking_output="{}",
        past_episodes_json=json.dumps(past_episodes[-10:]),  # Last 10 episodes
        patient_profile_json=json.dumps(patient_profile),
    )

    record = invoke_agent(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_message,
        model_id=MODEL_HAIKU,
        max_tokens=600,
    )

    # Update episode with health record
    try:
        table = get_table("episodes")
        table.update_item(
            Key={"episode_id": episode_id},
            UpdateExpression="SET health_record = :hr, updated_at = :ts",
            ExpressionAttributeValues={":hr": record, ":ts": now},
        )
    except Exception:
        pass  # DynamoDB unavailable in dev mode

    record["episode_id"] = episode_id
    return record


async def update_episode(episode_id: str, booking_out: dict) -> None:
    """Update an existing episode with booking result."""
    now = datetime.now(timezone.utc).isoformat()
    try:
        table = get_table("episodes")
        table.update_item(
            Key={"episode_id": episode_id},
            UpdateExpression="SET booking_output = :bo, updated_at = :ts, #st = :status",
            ExpressionAttributeValues={
                ":bo": booking_out,
                ":ts": now,
                ":status": "booked",
            },
            ExpressionAttributeNames={"#st": "status"},
        )
    except Exception:
        pass  # DynamoDB unavailable in dev mode
