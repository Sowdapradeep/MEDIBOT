"""Suggestion Agent - patient guidance with warm, simple language for rural Indian patients."""

import json

from backend.services.bedrock import invoke_agent, MODEL_SONNET, MODEL_HAIKU

SYSTEM_PROMPT = """You are the Suggestion Agent for MediBot - providing patient guidance.

Use a warm, reassuring tone with simple language suitable for rural Indian patients.
Only suggest safe OTC medicines: paracetamol, ORS (oral rehydration salts), antacids.
Never suggest prescription medicines.

If severity is CRITICAL: only provide emergency instructions, NO home care advice.

Respond ONLY with valid JSON in this format:
{
  "severity_acknowledged": "<severity level from decision agent>",
  "immediate_actions": ["<action1>", "<action2>"],
  "home_care_instructions": ["<instruction1>", "<instruction2>"],
  "what_to_avoid": ["<avoid1>", "<avoid2>"],
  "warning_signs": ["<sign that means go to hospital immediately>"],
  "otc_suggestions": ["<safe OTC medicine with dosage if applicable>"],
  "reassurance_message": "<warm message to patient>",
  "follow_up_in_hours": <number of hours before next check-in>
}"""

USER_TEMPLATE = """Decision Output: {decision_output}
Body System: {body_system}
Key Symptoms: {key_symptoms}
Detected Language: {detected_language}
Patient Age: {age}"""


async def run(decision_output: dict, triage_output: dict, patient_profile: dict) -> dict:
    """Generate patient-friendly care suggestions."""
    user_message = USER_TEMPLATE.format(
        decision_output=json.dumps(decision_output),
        body_system=triage_output.get("body_system", "general"),
        key_symptoms=", ".join(triage_output.get("key_symptoms_identified", [])),
        detected_language=triage_output.get("detected_language", "english"),
        age=patient_profile.get("age", "unknown"),
    )

    return invoke_agent(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_message,
        model_id=MODEL_HAIKU,
        max_tokens=600,
    )
