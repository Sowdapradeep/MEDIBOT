"""Emergency Alert Agent - critical care escalation."""

import json

from backend.services.bedrock import invoke_agent, MODEL_SONNET, MODEL_HAIKU
from backend.services.sns import send_emergency_alert
from backend.services.dynamodb import get_table

SYSTEM_PROMPT = """You are the Emergency Alert Agent for MediBot - critical care escalation.

Emergency levels:
- LEVEL_1: Patient needs to visit a clinic today (non-life-threatening but urgent)
- LEVEL_2: Call 108 now (ambulance needed, patient can communicate)
- LEVEL_3: Call 108 NOW, do NOT move the patient (life-threatening, possible spinal/cardiac)

108 is India's national ambulance number.

Respond ONLY with valid JSON in this format:
{
  "emergency_level": "<LEVEL_1|LEVEL_2|LEVEL_3>",
  "trigger_source": "<which agent or input triggered this>",
  "suspected_condition": "<suspected emergency condition>",
  "patient_instruction": "<clear instruction for patient or bystander>",
  "call_108": <true or false>,
  "hospital_search_radius_km": <radius to search for nearest hospital>,
  "sns_payload": {
    "patient_message": "<SMS to patient>",
    "contact_message": "<SMS to emergency contact>",
    "hospital_alert": "<alert to nearest hospital if LEVEL_3>"
  },
  "do_not_do": ["<things patient should NOT do>"],
  "stay_with_patient_instructions": "<instructions for bystander>",
  "episode_flagged_critical": true
}"""

USER_TEMPLATE = """Trigger Source: {trigger_source}
Trigger Agent Output: {trigger_agent_output}
Patient ID: {patient_id}
Age: {age}
Location (lat, lng): {lat}, {lng}
Detected Language: {detected_language}
Emergency Contact: {emergency_contact}
Known Conditions: {known_conditions}
Episode ID: {episode_id}"""


async def watch(decision_output: dict, patient_profile: dict) -> None:
    """Check if decision output requires emergency escalation."""
    if not decision_output.get("escalate_to_emergency", False):
        return

    # Escalation needed - trigger emergency flow
    await trigger(
        trigger_output=decision_output,
        patient_id=patient_profile.get("patient_id", ""),
        episode_id=patient_profile.get("episode_id", ""),
    )


async def trigger(trigger_output: dict, patient_id: str, episode_id: str) -> dict:
    """Trigger emergency alert: call Bedrock for instructions, then send SNS alerts."""
    # Build user message for Bedrock
    user_message = USER_TEMPLATE.format(
        trigger_source=trigger_output.get("_trigger_source", "decision_agent"),
        trigger_agent_output=json.dumps(trigger_output),
        patient_id=patient_id,
        age=trigger_output.get("_age", "unknown"),
        lat=trigger_output.get("_lat", 0),
        lng=trigger_output.get("_lng", 0),
        detected_language=trigger_output.get("_detected_language", "english"),
        emergency_contact=trigger_output.get("_emergency_contact", ""),
        known_conditions=trigger_output.get("_known_conditions", "none"),
        episode_id=episode_id,
    )

    result = invoke_agent(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_message,
        model_id=MODEL_SONNET,
        max_tokens=800,
    )

    # Send SNS alerts
    sns_payload = result.get("sns_payload", {})
    send_emergency_alert(
        patient_message=sns_payload.get("patient_message", "Emergency alert triggered. Call 108."),
        contact_message=sns_payload.get("contact_message", "Your family member needs emergency help."),
        hospital_alert=sns_payload.get("hospital_alert"),
    )

    # Flag episode as critical in DynamoDB
    table = get_table("episodes")
    table.update_item(
        Key={"episode_id": episode_id},
        UpdateExpression="SET #st = :status, emergency_output = :eo",
        ExpressionAttributeValues={
            ":status": "critical",
            ":eo": result,
        },
        ExpressionAttributeNames={"#st": "status"},
    )

    return result
