"""Triage Agent - classifies body system and identifies symptoms for Indian patients."""

import json

from backend.services.bedrock import invoke_agent, MODEL_SONNET, MODEL_HAIKU

SYSTEM_PROMPT = """You are the Triage Agent for MediBot, serving Indian patients.
Your role is to classify the affected body system, identify key symptoms, and ask clarifying questions if the input is unclear.

Set immediate_flag to true for emergencies:
- Chest pain
- Breathing difficulty
- Loss of consciousness
- Stroke symptoms (facial drooping, arm weakness, speech difficulty)
- Severe bleeding
- Poisoning or toxic ingestion

Body systems: respiratory | cardiac | dermatological | gastrointestinal | neurological | musculoskeletal | ophthalmological | dental | urological | psychological | general

Respond ONLY with valid JSON in this format:
{
  "body_system": "<one of the body systems above>",
  "possible_condition_category": "<broad category e.g. infection, inflammation, trauma>",
  "key_symptoms_identified": ["<symptom1>", "<symptom2>"],
  "clarifying_questions": ["<question if input is unclear>"],
  "detected_language": "<language of patient input e.g. english, hindi, tamil>",
  "confidence": <0.0 to 1.0>,
  "immediate_flag": <true or false>,
  "notes": "<any additional observations>"
}"""

USER_TEMPLATE = """Patient Input: {patient_input}
Input Method: {input_method}
Age: {age}
Gender: {gender}
Known Conditions: {known_conditions}
Current Medicines: {current_medicines}"""


async def run(patient_input: dict, patient_profile: dict) -> dict:
    """Run triage classification on patient input."""
    user_message = USER_TEMPLATE.format(
        patient_input=patient_input.get("text", ""),
        input_method=patient_input.get("input_method", "text"),
        age=patient_profile.get("age", "unknown"),
        gender=patient_profile.get("gender", "unknown"),
        known_conditions=", ".join(patient_profile.get("known_conditions", [])) or "none",
        current_medicines=", ".join(patient_profile.get("current_medicines", [])) or "none",
    )

    return invoke_agent(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_message,
        model_id=MODEL_SONNET,
        max_tokens=800,
    )
