"""
MediBot Emergency Alert Agent
Handles critical escalations from any agent and generates emergency responses.
"""

import json
from dataclasses import dataclass, field
from typing import Optional

from medibot.prompts import EMERGENCY_SYSTEM_PROMPT, EMERGENCY_USER_TEMPLATE


VALID_EMERGENCY_LEVELS = ["LEVEL_1", "LEVEL_2", "LEVEL_3"]
VALID_TRIGGER_SOURCES = ["triage", "decision", "followup", "patient_sos"]

HOSPITAL_SEARCH_RADIUS = {
    "LEVEL_1": 5,
    "LEVEL_2": 10,
    "LEVEL_3": 20,
}


@dataclass
class SNSPayload:
    """AWS SNS notification payload for emergency alerts."""

    patient_message: str = ""
    emergency_contact_message: str = ""
    hospital_alert: Optional[str] = None

    def to_dict(self) -> dict:
        payload = {
            "patient_message": self.patient_message,
            "emergency_contact_message": self.emergency_contact_message,
        }
        if self.hospital_alert:
            payload["hospital_alert"] = self.hospital_alert
        return payload


@dataclass
class EmergencyResult:
    """Parsed emergency alert result."""

    emergency_level: str = "LEVEL_1"
    trigger_source: str = "triage"
    suspected_condition: str = ""
    patient_instruction: str = ""
    call_108: bool = False
    hospital_search_radius_km: int = 5
    sns_payload: Optional[SNSPayload] = None
    do_not_do: list = field(default_factory=list)
    stay_with_patient_instructions: list = field(default_factory=list)
    episode_flagged_critical: bool = True

    @property
    def is_life_threatening(self) -> bool:
        return self.emergency_level == "LEVEL_3"

    @property
    def requires_ambulance(self) -> bool:
        return self.call_108

    @property
    def severity_rank(self) -> int:
        """Numeric rank: 1=LEVEL_1, 2=LEVEL_2, 3=LEVEL_3."""
        return VALID_EMERGENCY_LEVELS.index(self.emergency_level) + 1


@dataclass
class EmergencyInput:
    """Input context for the emergency agent."""

    trigger_source: str = "triage"
    trigger_agent_output: dict = field(default_factory=dict)
    patient_id: str = ""
    age: Optional[int] = None
    lat: float = 0.0
    lng: float = 0.0
    detected_language: str = "english"
    emergency_contact: str = ""
    known_conditions: str = "None reported"
    episode_id: str = ""


class EmergencyAgent:
    """
    Emergency alert agent that handles critical escalations from any pipeline agent.

    Usage:
        agent = EmergencyAgent(llm_client=your_llm_client)
        result = agent.escalate(emergency_input)
    """

    def __init__(self, llm_client=None):
        """
        Initialize the emergency agent.

        Args:
            llm_client: Any LLM client that implements a `chat(messages)` method
                        returning a string response.
        """
        self.llm_client = llm_client
        self.system_prompt = EMERGENCY_SYSTEM_PROMPT

    def build_user_message(self, emergency_input: EmergencyInput) -> str:
        """Format the user message from emergency input data."""
        return EMERGENCY_USER_TEMPLATE.format(
            trigger_source=emergency_input.trigger_source,
            trigger_agent_output=json.dumps(
                emergency_input.trigger_agent_output, indent=2
            ),
            patient_id=emergency_input.patient_id,
            age=emergency_input.age or "Unknown",
            lat=emergency_input.lat,
            lng=emergency_input.lng,
            detected_language=emergency_input.detected_language,
            emergency_contact=emergency_input.emergency_contact or "Not provided",
            known_conditions=emergency_input.known_conditions,
            episode_id=emergency_input.episode_id,
        )

    def escalate(self, emergency_input: EmergencyInput) -> EmergencyResult:
        """
        Process an emergency escalation and generate response.

        Args:
            emergency_input: Structured input with trigger details and patient context.

        Returns:
            EmergencyResult with instructions, SNS payload, and safety guidance.

        Raises:
            RuntimeError: If no LLM client is configured.
            ValueError: If the LLM response cannot be parsed as valid JSON.
        """
        if self.llm_client is None:
            raise RuntimeError(
                "No LLM client configured. Pass an llm_client to EmergencyAgent()."
            )

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": self.build_user_message(emergency_input)},
        ]

        raw_response = self.llm_client.chat(messages)
        return self._parse_response(raw_response)

    def _parse_response(self, raw: str) -> EmergencyResult:
        """Parse the LLM JSON response into an EmergencyResult."""
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            raise ValueError(f"LLM returned invalid JSON: {e}\nRaw: {raw}")

        # Validate emergency_level
        emergency_level = data.get("emergency_level", "LEVEL_1").upper()
        if emergency_level not in VALID_EMERGENCY_LEVELS:
            emergency_level = "LEVEL_1"

        # Validate trigger_source
        trigger_source = data.get("trigger_source", "triage").lower()
        if trigger_source not in VALID_TRIGGER_SOURCES:
            trigger_source = "triage"

        # Validate hospital_search_radius_km
        radius = data.get("hospital_search_radius_km")
        if radius not in (5, 10, 20):
            radius = HOSPITAL_SEARCH_RADIUS.get(emergency_level, 10)

        # Parse SNS payload
        sns_data = data.get("sns_payload", {})
        sns_payload = SNSPayload(
            patient_message=sns_data.get("patient_message", ""),
            emergency_contact_message=sns_data.get("emergency_contact_message", ""),
            hospital_alert=sns_data.get("hospital_alert"),
        )

        return EmergencyResult(
            emergency_level=emergency_level,
            trigger_source=trigger_source,
            suspected_condition=data.get("suspected_condition", ""),
            patient_instruction=data.get("patient_instruction", ""),
            call_108=data.get("call_108", False),
            hospital_search_radius_km=radius,
            sns_payload=sns_payload,
            do_not_do=data.get("do_not_do", []),
            stay_with_patient_instructions=data.get(
                "stay_with_patient_instructions", []
            ),
            episode_flagged_critical=data.get("episode_flagged_critical", True),
        )

    def format_for_patient(self, result: EmergencyResult) -> str:
        """
        Format the emergency result as a patient-facing alert.

        Args:
            result: The emergency result.

        Returns:
            A clear, calm emergency message for the patient.
        """
        lines = []

        # Level-based header
        if result.is_life_threatening:
            lines.append("🚨🚨🚨 EMERGENCY — LIFE-THREATENING 🚨🚨🚨")
        elif result.emergency_level == "LEVEL_2":
            lines.append("🚨 EMERGENCY — IMMEDIATE ACTION NEEDED")
        else:
            lines.append("⚠️ URGENT — MEDICAL ATTENTION REQUIRED")

        lines.append("=" * 45)

        # Patient instruction
        if result.patient_instruction:
            lines.append(result.patient_instruction)
            lines.append("")

        # Call 108
        if result.call_108:
            lines.append("📞 CALL 108 NOW (National Emergency Ambulance)")
            lines.append("")

        # Do not do
        if result.do_not_do:
            lines.append("❌ DO NOT:")
            for item in result.do_not_do:
                lines.append(f"  • {item}")
            lines.append("")

        # Stay with patient instructions
        if result.stay_with_patient_instructions:
            lines.append("✅ WHILE WAITING:")
            for item in result.stay_with_patient_instructions:
                lines.append(f"  • {item}")

        return "\n".join(lines)

    def get_sns_messages(self, result: EmergencyResult) -> dict:
        """
        Get the SNS notification messages ready for dispatch.

        Args:
            result: The emergency result.

        Returns:
            Dict with patient_message, emergency_contact_message, and hospital_alert.
        """
        if result.sns_payload:
            return result.sns_payload.to_dict()
        return {
            "patient_message": result.patient_instruction,
            "emergency_contact_message": (
                f"EMERGENCY ALERT: Your contact needs immediate medical help. "
                f"Suspected: {result.suspected_condition}. "
                f"Please call 108 or reach them immediately."
            ),
        }
