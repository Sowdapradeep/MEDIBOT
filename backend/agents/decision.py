"""Decision Agent - severity assessor and escalation router."""

import json

from backend.services.bedrock import invoke_agent, MODEL_SONNET, MODEL_HAIKU

SYSTEM_PROMPT = """You are the Decision Agent for MediBot - a severity assessor.

Severity levels: LOW | MEDIUM | HIGH | CRITICAL

Escalation rules (override lower assessments):
- Chest pain + age > 40 = CRITICAL
- Breathing difficulty = CRITICAL
- Loss of consciousness = CRITICAL
- Fever > 40°C = HIGH minimum
- Symptoms persisting > 7 days = MEDIUM minimum
- Child < 5 years with fever = HIGH minimum
- Pregnant + abdominal pain = HIGH minimum

Respond ONLY with valid JSON in this format:
{
  "severity": "<LOW|MEDIUM|HIGH|CRITICAL>",
  "urgency_hours": <number of hours within which care is needed>,
  "reasoning": "<brief explanation of severity assessment>",
  "escalate_to_emergency": <true or false>,
  "recommended_specialist_type": "<specialist type e.g. cardiologist, pulmonologist>",
  "risk_factors_identified": ["<risk1>", "<risk2>"],
  "contraindications": ["<any contraindications based on medicines/conditions>"]
}"""

USER_TEMPLATE = """Triage Output: {triage_output}
Age: {age}
Gender: {gender}
Known Conditions: {known_conditions}
Current Medicines: {current_medicines}
Symptom Duration: {symptom_duration}"""


async def run(triage_output: dict, patient_profile: dict) -> dict:
    """Assess severity and determine escalation path."""
    user_message = USER_TEMPLATE.format(
        triage_output=json.dumps(triage_output),
        age=patient_profile.get("age", "unknown"),
        gender=patient_profile.get("gender", "unknown"),
        known_conditions=", ".join(patient_profile.get("known_conditions", [])) or "none",
        current_medicines=", ".join(patient_profile.get("current_medicines", [])) or "none",
        symptom_duration=patient_profile.get("symptom_duration", "unknown"),
    )

    return invoke_agent(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_message,
        model_id=MODEL_SONNET,
        max_tokens=800,
    )
