"""Prescription Parsing Agent - pharmaceutical data extractor for Indian prescriptions."""

import json

from backend.services.bedrock import invoke_agent, MODEL_SONNET, MODEL_HAIKU
from backend.services.textract import parse_prescription_sync

SYSTEM_PROMPT = """You are the Prescription Parsing Agent for MediBot - a pharmaceutical data extractor.

You handle Indian medical abbreviations:
- Frequency: OD (once daily), BD (twice daily), TID (three times daily), QID (four times daily), SOS (as needed)
- Timing: AC (before food), PC (after food), HS (at bedtime)
- Forms: Tab (tablet), Cap (capsule), Syr (syrup), Inj (injection)

Generate reminder_times from frequency + food timing:
- OD AC → ["07:30"]
- BD PC → ["08:30", "20:30"]
- TID AC → ["07:30", "13:30", "19:30"]
- QID → ["08:00", "12:00", "16:00", "20:00"]
- HS → ["22:00"]

Respond ONLY with valid JSON in this format:
{
  "medicines": [
    {
      "name": "<medicine name>",
      "form": "<Tab|Cap|Syr|Inj>",
      "dosage": "<e.g. 500mg>",
      "frequency": "<OD|BD|TID|QID|SOS>",
      "timing": "<AC|PC|HS>",
      "duration_days": <number>,
      "reminder_times": ["<HH:MM>"],
      "special_instructions": "<any special notes>"
    }
  ],
  "doctor_name": "<prescribing doctor name if found>",
  "prescription_date": "<date if found, ISO format>",
  "diagnosis_noted": "<diagnosis written on prescription if any>",
  "follow_up_date": "<follow-up date if mentioned>",
  "needs_pharmacist_review": <true if unclear or potentially dangerous interaction>,
  "ocr_quality": "<good|fair|poor>",
  "raw_text_used": "<the OCR text that was analyzed>"
}"""

USER_TEMPLATE = """OCR Raw Text: {textract_raw_text}
Known Conditions: {known_conditions}
Current Medicines: {current_medicines}
Episode Context: {episode_context}"""


async def run(image_bytes: bytes, episode_id: str, patient_id: str) -> dict:
    """Parse a prescription image: OCR via Textract, then analyze with Bedrock."""
    # Step 1: Extract text from prescription image using Textract
    raw_text = parse_prescription_sync(image_bytes)

    # Step 2: Pass OCR text to Bedrock for structured extraction
    user_message = USER_TEMPLATE.format(
        textract_raw_text=raw_text,
        known_conditions="",  # Will be enriched by orchestrator if available
        current_medicines="",
        episode_context=json.dumps({"episode_id": episode_id, "patient_id": patient_id}),
    )

    return invoke_agent(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_message,
        model_id=MODEL_SONNET,
        max_tokens=1000,
    )
