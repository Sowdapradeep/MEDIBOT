"""Image Symptom Analysis Agent - analyzes photos of symptoms using Bedrock vision."""

import base64
import json
import logging

from backend.services.aws_clients import get_bedrock
from backend.services.bedrock import MODEL_SONNET

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are MediBot's Visual Symptom Analysis Agent — a medical image assessment specialist for Indian patients.

YOUR ROLE:
- Analyze patient-uploaded photos of visible symptoms (rashes, wounds, swelling, skin conditions, eye issues, etc.)
- Identify the affected body system and possible condition category
- Provide severity assessment based on visual appearance
- Never diagnose definitively. Classify and suggest next steps only.

RULES:
- Always respond in valid JSON only. No prose. No markdown.
- Be conservative — when unsure, recommend seeing a doctor
- Never prescribe medicines based on images alone
- Flag anything that looks serious or infected

BODY SYSTEMS (use exactly):
respiratory | cardiac | dermatological | gastrointestinal | neurological |
musculoskeletal | ophthalmological | dental | urological | psychological | general

OUTPUT FORMAT:
{
  "body_system": "string",
  "possible_condition_category": "string",
  "visual_observations": ["what you see in the image"],
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "urgency_hours": null | 24 | 6 | 1,
  "confidence": 0.0-1.0,
  "immediate_flag": false,
  "reasoning": "brief explanation of assessment",
  "home_care_suggestions": ["suggestion1", "suggestion2"],
  "warning_signs": ["sign1", "sign2"],
  "recommended_specialist": "string",
  "see_doctor_recommendation": "string",
  "notes": "any additional observations"
}

CRITICAL SAFETY RULE:
If you see signs of severe infection, deep wounds, burns, or anything life-threatening,
set immediate_flag: true and severity: CRITICAL."""


async def analyze_image(image_bytes: bytes, content_type: str, patient_profile: dict) -> dict:
    """Analyze a symptom image using Bedrock Claude vision."""
    # Encode image to base64
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    # Map content type to media type
    media_type = content_type if content_type in ["image/jpeg", "image/png", "image/gif", "image/webp"] else "image/jpeg"

    # Build the message with image
    user_message = [
        {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": media_type,
                "data": image_b64,
            },
        },
        {
            "type": "text",
            "text": f"""Analyze this image of a patient's symptom.

Patient context:
- Age: {patient_profile.get('age', 'unknown')}
- Gender: {patient_profile.get('gender', 'unknown')}
- Known conditions: {', '.join(patient_profile.get('known_conditions', [])) or 'none'}
- Current medicines: {', '.join(patient_profile.get('current_medicines', [])) or 'none'}

Describe what you observe and provide your assessment in the required JSON format.""",
        },
    ]

    # Call Bedrock with vision
    response = get_bedrock().invoke_model(
        modelId=MODEL_SONNET,
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000,
            "system": SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": user_message}],
        }),
    )

    raw = json.loads(response["body"].read())
    text = raw["content"][0]["text"].strip()
    text = text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        logger.error(f"Image analysis returned invalid JSON: {e}\nRaw: {text}")
        raise ValueError(f"Image analysis failed: {e}")
