"""
MediBot Suggestion Agent
Provides safe, actionable home care guidance tailored to severity level.
"""

import json
from dataclasses import dataclass, field
from typing import Optional

from medibot.prompts import SUGGESTION_SYSTEM_PROMPT, SUGGESTION_USER_TEMPLATE
from medibot.triage_agent import TriageResult
from medibot.decision_agent import DecisionResult


@dataclass
class SuggestionResult:
    """Parsed suggestion/guidance result."""

    severity_acknowledged: str = "LOW"
    immediate_actions: list = field(default_factory=list)
    home_care_instructions: list = field(default_factory=list)
    what_to_avoid: list = field(default_factory=list)
    warning_signs: list = field(default_factory=list)
    otc_suggestions: list = field(default_factory=list)
    reassurance_message: str = ""
    follow_up_in_hours: Optional[int] = None

    @property
    def is_emergency_only(self) -> bool:
        """CRITICAL cases get no home care — emergency instructions only."""
        return self.severity_acknowledged == "CRITICAL"

    @property
    def has_home_care(self) -> bool:
        return len(self.home_care_instructions) > 0


@dataclass
class SuggestionInput:
    """Input context for the suggestion agent."""

    triage_result: TriageResult
    decision_result: DecisionResult
    age: Optional[int] = None
    detected_language: str = "english"


class SuggestionAgent:
    """
    Suggestion agent that provides patient guidance based on triage and decision output.

    Usage:
        agent = SuggestionAgent(llm_client=your_llm_client)
        result = agent.suggest(suggestion_input)
    """

    def __init__(self, llm_client=None):
        """
        Initialize the suggestion agent.

        Args:
            llm_client: Any LLM client that implements a `chat(messages)` method
                        returning a string response.
        """
        self.llm_client = llm_client
        self.system_prompt = SUGGESTION_SYSTEM_PROMPT

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

    def build_user_message(self, suggestion_input: SuggestionInput) -> str:
        """Format the user message from suggestion input data."""
        triage = suggestion_input.triage_result
        return SUGGESTION_USER_TEMPLATE.format(
            decision_output=self._format_decision_output(
                suggestion_input.decision_result
            ),
            body_system=triage.body_system,
            key_symptoms=", ".join(triage.key_symptoms_identified),
            detected_language=suggestion_input.detected_language,
            age=suggestion_input.age or "Not provided",
        )

    def suggest(self, suggestion_input: SuggestionInput) -> SuggestionResult:
        """
        Generate patient guidance based on triage and decision output.

        Args:
            suggestion_input: Structured input with triage + decision results.

        Returns:
            SuggestionResult with home care guidance.

        Raises:
            RuntimeError: If no LLM client is configured.
            ValueError: If the LLM response cannot be parsed as valid JSON.
        """
        if self.llm_client is None:
            raise RuntimeError(
                "No LLM client configured. Pass an llm_client to SuggestionAgent()."
            )

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": self.build_user_message(suggestion_input)},
        ]

        raw_response = self.llm_client.chat(messages)
        return self._parse_response(raw_response)

    def _parse_response(self, raw: str) -> SuggestionResult:
        """Parse the LLM JSON response into a SuggestionResult."""
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            raise ValueError(f"LLM returned invalid JSON: {e}\nRaw: {raw}")

        # Validate severity_acknowledged
        severity = data.get("severity_acknowledged", "LOW").upper()
        valid_levels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        if severity not in valid_levels:
            severity = "LOW"

        # Validate follow_up_in_hours
        follow_up = data.get("follow_up_in_hours")
        if follow_up is not None:
            try:
                follow_up = int(follow_up)
            except (TypeError, ValueError):
                follow_up = None

        return SuggestionResult(
            severity_acknowledged=severity,
            immediate_actions=data.get("immediate_actions", []),
            home_care_instructions=data.get("home_care_instructions", []),
            what_to_avoid=data.get("what_to_avoid", []),
            warning_signs=data.get("warning_signs", []),
            otc_suggestions=data.get("otc_suggestions", []),
            reassurance_message=data.get("reassurance_message", ""),
            follow_up_in_hours=follow_up,
        )

    def format_for_patient(self, result: SuggestionResult) -> str:
        """
        Format the suggestion result into a patient-friendly message.

        Args:
            result: The suggestion result from the LLM.

        Returns:
            A readable, warm message suitable for display to the patient.
        """
        lines = []

        # Reassurance first
        if result.reassurance_message:
            lines.append(result.reassurance_message)
            lines.append("")

        # Emergency-only path
        if result.is_emergency_only:
            lines.append("⚠️ EMERGENCY — Please act immediately:")
            for action in result.immediate_actions:
                lines.append(f"  • {action}")
            return "\n".join(lines)

        # Immediate actions
        if result.immediate_actions:
            lines.append("Do this right now:")
            for action in result.immediate_actions:
                lines.append(f"  • {action}")
            lines.append("")

        # Home care
        if result.home_care_instructions:
            lines.append("Home care tips:")
            for instruction in result.home_care_instructions:
                lines.append(f"  • {instruction}")
            lines.append("")

        # What to avoid
        if result.what_to_avoid:
            lines.append("Avoid these:")
            for item in result.what_to_avoid:
                lines.append(f"  • {item}")
            lines.append("")

        # OTC suggestions
        if result.otc_suggestions:
            lines.append("You can try:")
            for otc in result.otc_suggestions:
                lines.append(f"  • {otc}")
            lines.append("")

        # Warning signs
        if result.warning_signs:
            lines.append("⚠️ See a doctor immediately if:")
            for sign in result.warning_signs:
                lines.append(f"  • {sign}")
            lines.append("")

        # Follow-up
        if result.follow_up_in_hours:
            lines.append(
                f"Check back in {result.follow_up_in_hours} hours if not improving."
            )

        return "\n".join(lines)
