"""
MediBot Triage Agent
Classifies patient symptoms and routes to the appropriate body system specialist.
"""

import json
from dataclasses import dataclass, field
from typing import Optional

from medibot.prompts import TRIAGE_SYSTEM_PROMPT, TRIAGE_USER_TEMPLATE


@dataclass
class PatientInput:
    """Structured patient intake data."""

    patient_input: str
    input_method: str = "text"
    age: Optional[int] = None
    gender: Optional[str] = None
    known_conditions: str = "None reported"
    current_medicines: str = "None reported"


@dataclass
class TriageResult:
    """Parsed triage classification result."""

    body_system: str = "general"
    possible_condition_category: str = ""
    key_symptoms_identified: list = field(default_factory=list)
    clarifying_questions: list = field(default_factory=list)
    detected_language: str = "english"
    confidence: float = 0.0
    notes: str = ""
    immediate_flag: bool = False

    @property
    def needs_clarification(self) -> bool:
        return len(self.clarifying_questions) > 0

    @property
    def is_emergency(self) -> bool:
        return self.immediate_flag


VALID_BODY_SYSTEMS = [
    "respiratory",
    "cardiac",
    "dermatological",
    "gastrointestinal",
    "neurological",
    "musculoskeletal",
    "ophthalmological",
    "dental",
    "urological",
    "psychological",
    "general",
]


class TriageAgent:
    """
    Triage agent that classifies patient symptoms using an LLM backend.

    Usage:
        agent = TriageAgent(llm_client=your_llm_client)
        result = agent.classify(patient_input)
    """

    def __init__(self, llm_client=None):
        """
        Initialize the triage agent.

        Args:
            llm_client: Any LLM client that implements a `chat(messages)` method
                        returning a string response. Compatible with OpenAI, Bedrock, etc.
        """
        self.llm_client = llm_client
        self.system_prompt = TRIAGE_SYSTEM_PROMPT

    def build_user_message(self, patient: PatientInput) -> str:
        """Format the user message from patient intake data."""
        return TRIAGE_USER_TEMPLATE.format(
            patient_input=patient.patient_input,
            input_method=patient.input_method,
            age=patient.age or "Not provided",
            gender=patient.gender or "Not provided",
            known_conditions=patient.known_conditions,
            current_medicines=patient.current_medicines,
        )

    def classify(self, patient: PatientInput) -> TriageResult:
        """
        Classify patient symptoms and return a triage result.

        Args:
            patient: Structured patient input data.

        Returns:
            TriageResult with classification details.

        Raises:
            RuntimeError: If no LLM client is configured.
            ValueError: If the LLM response cannot be parsed as valid JSON.
        """
        if self.llm_client is None:
            raise RuntimeError(
                "No LLM client configured. Pass an llm_client to TriageAgent()."
            )

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": self.build_user_message(patient)},
        ]

        raw_response = self.llm_client.chat(messages)
        return self._parse_response(raw_response)

    def _parse_response(self, raw: str) -> TriageResult:
        """Parse the LLM JSON response into a TriageResult."""
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            raise ValueError(f"LLM returned invalid JSON: {e}\nRaw: {raw}")

        # Validate body_system
        body_system = data.get("body_system", "general")
        if body_system not in VALID_BODY_SYSTEMS:
            body_system = "general"

        # Clamp confidence to valid range
        confidence = data.get("confidence", 0.0)
        confidence = max(0.0, min(1.0, float(confidence)))

        return TriageResult(
            body_system=body_system,
            possible_condition_category=data.get("possible_condition_category", ""),
            key_symptoms_identified=data.get("key_symptoms_identified", []),
            clarifying_questions=data.get("clarifying_questions", []),
            detected_language=data.get("detected_language", "english"),
            confidence=confidence,
            notes=data.get("notes", ""),
            immediate_flag=data.get("immediate_flag", False),
        )

    def handle_emergency(self, result: TriageResult) -> dict:
        """
        Handle emergency cases that bypass normal routing.

        Returns routing metadata for emergency dispatch.
        """
        return {
            "action": "EMERGENCY_ROUTE",
            "body_system": result.body_system,
            "symptoms": result.key_symptoms_identified,
            "message": (
                "Emergency symptoms detected. "
                "Please call 108 (ambulance) or visit the nearest emergency room immediately."
            ),
        }

    def route(self, result: TriageResult) -> dict:
        """
        Route the triage result to the appropriate next step.

        Returns:
            dict with routing action and metadata.
        """
        if result.is_emergency:
            return self.handle_emergency(result)

        if result.needs_clarification:
            return {
                "action": "ASK_CLARIFICATION",
                "questions": result.clarifying_questions,
            }

        return {
            "action": "ROUTE_TO_SPECIALIST",
            "body_system": result.body_system,
            "condition_category": result.possible_condition_category,
            "confidence": result.confidence,
        }
