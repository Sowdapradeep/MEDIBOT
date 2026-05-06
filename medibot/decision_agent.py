"""
MediBot Decision Agent
Assesses clinical severity and determines urgency timeline based on triage output.
"""

import json
from dataclasses import dataclass, field
from typing import Optional

from medibot.prompts import DECISION_SYSTEM_PROMPT, DECISION_USER_TEMPLATE
from medibot.triage_agent import TriageResult


VALID_SEVERITY_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

URGENCY_HOURS_MAP = {
    "LOW": None,
    "MEDIUM": 24,
    "HIGH": 6,
    "CRITICAL": 1,
}


@dataclass
class DecisionResult:
    """Parsed decision/severity assessment result."""

    severity: str = "LOW"
    urgency_hours: Optional[int] = None
    reasoning: str = ""
    escalate_to_emergency: bool = False
    recommended_specialist_type: str = ""
    risk_factors_identified: list = field(default_factory=list)
    contraindications: list = field(default_factory=list)

    @property
    def is_critical(self) -> bool:
        return self.severity == "CRITICAL"

    @property
    def needs_emergency(self) -> bool:
        return self.escalate_to_emergency

    @property
    def severity_rank(self) -> int:
        """Numeric rank for comparison: 0=LOW, 1=MEDIUM, 2=HIGH, 3=CRITICAL."""
        return VALID_SEVERITY_LEVELS.index(self.severity)


@dataclass
class DecisionInput:
    """Input context for the decision agent."""

    triage_result: TriageResult
    age: Optional[int] = None
    gender: Optional[str] = None
    known_conditions: str = "None reported"
    current_medicines: str = "None reported"
    symptom_duration: str = "Not specified"


class DecisionAgent:
    """
    Decision agent that assesses severity and urgency based on triage output.

    Usage:
        agent = DecisionAgent(llm_client=your_llm_client)
        result = agent.assess(decision_input)
    """

    def __init__(self, llm_client=None):
        """
        Initialize the decision agent.

        Args:
            llm_client: Any LLM client that implements a `chat(messages)` method
                        returning a string response.
        """
        self.llm_client = llm_client
        self.system_prompt = DECISION_SYSTEM_PROMPT

    def _format_triage_output(self, triage: TriageResult) -> str:
        """Convert triage result to JSON string for the prompt."""
        return json.dumps(
            {
                "body_system": triage.body_system,
                "possible_condition_category": triage.possible_condition_category,
                "key_symptoms_identified": triage.key_symptoms_identified,
                "confidence": triage.confidence,
                "immediate_flag": triage.immediate_flag,
                "notes": triage.notes,
            }
        )

    def build_user_message(self, decision_input: DecisionInput) -> str:
        """Format the user message from decision input data."""
        return DECISION_USER_TEMPLATE.format(
            triage_output=self._format_triage_output(decision_input.triage_result),
            age=decision_input.age or "Not provided",
            gender=decision_input.gender or "Not provided",
            known_conditions=decision_input.known_conditions,
            current_medicines=decision_input.current_medicines,
            symptom_duration=decision_input.symptom_duration,
        )

    def assess(self, decision_input: DecisionInput) -> DecisionResult:
        """
        Assess severity based on triage output and patient context.

        Args:
            decision_input: Structured input with triage result and patient metadata.

        Returns:
            DecisionResult with severity assessment.

        Raises:
            RuntimeError: If no LLM client is configured.
            ValueError: If the LLM response cannot be parsed as valid JSON.
        """
        if self.llm_client is None:
            raise RuntimeError(
                "No LLM client configured. Pass an llm_client to DecisionAgent()."
            )

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": self.build_user_message(decision_input)},
        ]

        raw_response = self.llm_client.chat(messages)
        return self._parse_response(raw_response)

    def _parse_response(self, raw: str) -> DecisionResult:
        """Parse the LLM JSON response into a DecisionResult."""
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            raise ValueError(f"LLM returned invalid JSON: {e}\nRaw: {raw}")

        # Validate severity level
        severity = data.get("severity", "LOW").upper()
        if severity not in VALID_SEVERITY_LEVELS:
            severity = "LOW"

        # Validate urgency_hours
        urgency_hours = data.get("urgency_hours")
        if urgency_hours is not None:
            try:
                urgency_hours = int(urgency_hours)
            except (TypeError, ValueError):
                urgency_hours = URGENCY_HOURS_MAP.get(severity)

        return DecisionResult(
            severity=severity,
            urgency_hours=urgency_hours,
            reasoning=data.get("reasoning", ""),
            escalate_to_emergency=data.get("escalate_to_emergency", False),
            recommended_specialist_type=data.get("recommended_specialist_type", ""),
            risk_factors_identified=data.get("risk_factors_identified", []),
            contraindications=data.get("contraindications", []),
        )

    def get_patient_advisory(self, result: DecisionResult) -> str:
        """
        Generate a patient-facing advisory message based on severity.

        Args:
            result: The decision result from assessment.

        Returns:
            Human-readable advisory string.
        """
        advisories = {
            "LOW": (
                "Your symptoms appear manageable at home. Monitor for 24-48 hours. "
                "If symptoms worsen, please consult a doctor."
            ),
            "MEDIUM": (
                "We recommend you see a doctor within the next 24 hours. "
                "Your symptoms need professional evaluation."
            ),
            "HIGH": (
                "Please see a doctor today. Your symptoms require prompt medical attention. "
                "Visit your nearest clinic or hospital OPD."
            ),
            "CRITICAL": (
                "⚠️ EMERGENCY: Please go to the nearest emergency room immediately or call 108. "
                "Do not wait. Your symptoms require urgent medical care."
            ),
        }
        return advisories.get(result.severity, advisories["LOW"])
