"""
MediBot Doctor Recommendation Agent
Maps patient condition to the correct medical specialty and provides routing metadata.
"""

import json
from dataclasses import dataclass, field
from typing import Optional

from medibot.prompts import DOCTOR_REC_SYSTEM_PROMPT, DOCTOR_REC_USER_TEMPLATE
from medibot.decision_agent import DecisionResult


@dataclass
class DoctorRecResult:
    """Parsed doctor recommendation result."""

    primary_specialty: str = "General Physician"
    secondary_specialty: Optional[str] = None
    rural_fallback: Optional[str] = None
    specialty_reasoning: str = ""
    urgency_context: str = ""
    search_keywords: list = field(default_factory=list)
    telemedicine_suitable: bool = False
    home_visit_suitable: bool = False

    @property
    def has_rural_fallback(self) -> bool:
        return self.rural_fallback is not None

    @property
    def specialties(self) -> list:
        """Return all recommended specialties in priority order."""
        specs = [self.primary_specialty]
        if self.secondary_specialty:
            specs.append(self.secondary_specialty)
        if self.rural_fallback:
            specs.append(self.rural_fallback)
        return specs


@dataclass
class DoctorRecInput:
    """Input context for the doctor recommendation agent."""

    decision_result: DecisionResult
    body_system: str = "general"
    age: Optional[int] = None
    gender: Optional[str] = None
    known_conditions: str = "None reported"
    location_type: str = "urban"  # "urban" | "rural" | "semi-urban"


class DoctorRecAgent:
    """
    Doctor recommendation agent that routes patients to the correct specialty.

    Usage:
        agent = DoctorRecAgent(llm_client=your_llm_client)
        result = agent.recommend(doctor_rec_input)
    """

    def __init__(self, llm_client=None):
        """
        Initialize the doctor recommendation agent.

        Args:
            llm_client: Any LLM client that implements a `chat(messages)` method
                        returning a string response.
        """
        self.llm_client = llm_client
        self.system_prompt = DOCTOR_REC_SYSTEM_PROMPT

    def _format_decision_output(self, decision: DecisionResult) -> str:
        """Convert decision result to JSON string for the prompt."""
        return json.dumps(
            {
                "severity": decision.severity,
                "urgency_hours": decision.urgency_hours,
                "reasoning": decision.reasoning,
                "escalate_to_emergency": decision.escalate_to_emergency,
                "recommended_specialist_type": decision.recommended_specialist_type,
                "risk_factors_identified": decision.risk_factors_identified,
                "contraindications": decision.contraindications,
            }
        )

    def build_user_message(self, rec_input: DoctorRecInput) -> str:
        """Format the user message from recommendation input data."""
        return DOCTOR_REC_USER_TEMPLATE.format(
            decision_output=self._format_decision_output(rec_input.decision_result),
            body_system=rec_input.body_system,
            severity=rec_input.decision_result.severity,
            location_type=rec_input.location_type,
            age=rec_input.age or "Not provided",
            gender=rec_input.gender or "Not provided",
            known_conditions=rec_input.known_conditions,
        )

    def recommend(self, rec_input: DoctorRecInput) -> DoctorRecResult:
        """
        Generate doctor/specialist recommendation.

        Args:
            rec_input: Structured input with decision result and patient context.

        Returns:
            DoctorRecResult with specialist routing metadata.

        Raises:
            RuntimeError: If no LLM client is configured.
            ValueError: If the LLM response cannot be parsed as valid JSON.
        """
        if self.llm_client is None:
            raise RuntimeError(
                "No LLM client configured. Pass an llm_client to DoctorRecAgent()."
            )

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": self.build_user_message(rec_input)},
        ]

        raw_response = self.llm_client.chat(messages)
        return self._parse_response(raw_response)

    def _parse_response(self, raw: str) -> DoctorRecResult:
        """Parse the LLM JSON response into a DoctorRecResult."""
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            raise ValueError(f"LLM returned invalid JSON: {e}\nRaw: {raw}")

        return DoctorRecResult(
            primary_specialty=data.get("primary_specialty", "General Physician"),
            secondary_specialty=data.get("secondary_specialty"),
            rural_fallback=data.get("rural_fallback"),
            specialty_reasoning=data.get("specialty_reasoning", ""),
            urgency_context=data.get("urgency_context", ""),
            search_keywords=data.get("search_keywords", []),
            telemedicine_suitable=data.get("telemedicine_suitable", False),
            home_visit_suitable=data.get("home_visit_suitable", False),
        )

    def format_for_patient(self, result: DoctorRecResult) -> str:
        """
        Format the recommendation into a patient-friendly message.

        Args:
            result: The doctor recommendation result.

        Returns:
            A readable message with specialist guidance.
        """
        lines = []

        lines.append(f"Recommended doctor: {result.primary_specialty}")

        if result.secondary_specialty:
            lines.append(f"Alternative: {result.secondary_specialty}")

        if result.urgency_context:
            lines.append(f"Timing: {result.urgency_context}")

        if result.telemedicine_suitable:
            lines.append("💻 Telemedicine consultation is suitable for this case.")

        if result.home_visit_suitable:
            lines.append("🏠 A home visit may be arranged if available in your area.")

        if result.has_rural_fallback:
            lines.append(f"Nearest option: {result.rural_fallback}")

        if result.search_keywords:
            lines.append(
                f"Search tip: Look for \"{', '.join(result.search_keywords)}\" near you."
            )

        return "\n".join(lines)
