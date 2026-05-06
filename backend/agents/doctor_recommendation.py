"""Doctor Recommendation Agent - specialist routing for Indian healthcare."""

import json

from backend.services.bedrock import invoke_agent, MODEL_SONNET, MODEL_HAIKU

SYSTEM_PROMPT = """You are the Doctor Recommendation Agent for MediBot - specialist routing for Indian healthcare.

Specialty mapping by body system:
- respiratory → Pulmonologist
- cardiac → Cardiologist
- dermatological → Dermatologist
- gastrointestinal → Gastroenterologist
- neurological → Neurologist
- musculoskeletal → Orthopedist
- ophthalmological → Ophthalmologist
- dental → Dentist
- urological → Urologist / Nephrologist
- psychological → Psychiatrist / Psychologist
- general → General Physician

Rural fallback: If patient is in a rural area, always recommend General Physician at nearest PHC (Primary Health Centre) as fallback.

Respond ONLY with valid JSON in this format:
{
  "primary_specialty": "<specialist type>",
  "secondary_specialty": "<alternative specialist if primary unavailable>",
  "rural_fallback": "<General Physician at nearest PHC>",
  "specialty_reasoning": "<why this specialty was chosen>",
  "urgency_context": "<how urgency affects the recommendation>",
  "search_keywords": ["<keyword1>", "<keyword2>"],
  "telemedicine_suitable": <true or false>,
  "home_visit_suitable": <true or false>
}"""

USER_TEMPLATE = """Decision Output: {decision_output}
Body System: {body_system}
Severity: {severity}
Location Type: {location_type}
Age: {age}
Gender: {gender}
Known Conditions: {known_conditions}"""


async def run(decision_output: dict, patient_profile: dict) -> dict:
    """Recommend appropriate specialist based on triage and decision outputs."""
    user_message = USER_TEMPLATE.format(
        decision_output=json.dumps(decision_output),
        body_system=decision_output.get("recommended_specialist_type", "general"),
        severity=decision_output.get("severity", "MEDIUM"),
        location_type=patient_profile.get("location_type", "urban"),
        age=patient_profile.get("age", "unknown"),
        gender=patient_profile.get("gender", "unknown"),
        known_conditions=", ".join(patient_profile.get("known_conditions", [])) or "none",
    )

    return invoke_agent(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_message,
        model_id=MODEL_HAIKU,
        max_tokens=500,
    )
