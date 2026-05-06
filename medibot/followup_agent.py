"""
MediBot Follow-Up Monitoring Agent
Tracks daily patient recovery, adherence, and decides next actions.
"""

import json
from dataclasses import dataclass, field
from typing import Optional

from medibot.prompts import FOLLOWUP_SYSTEM_PROMPT, FOLLOWUP_USER_TEMPLATE


VALID_RECOVERY_STATUSES = [
    "IMPROVING",
    "STABLE",
    "DETERIORATING",
    "NOT_ADHERING",
    "CURED",
]

VALID_ACTIONS = ["continue", "escalate", "emergency", "archive"]
VALID_TRENDS = ["improving", "stable", "worsening"]


@dataclass
class FollowUpResult:
    """Parsed follow-up monitoring result."""

    recovery_status: str = "STABLE"
    medicine_adherence_percent: int = 0
    symptom_trend: str = "stable"
    pain_score_today: int = 0
    action_required: str = "continue"
    escalate_to_emergency: bool = False
    patient_message: str = ""
    next_checkin_questions: list = field(default_factory=list)
    days_since_start: int = 0
    estimated_recovery_days_remaining: Optional[int] = None
    episode_close_recommended: bool = False

    @property
    def is_emergency(self) -> bool:
        return self.escalate_to_emergency

    @property
    def is_recovering(self) -> bool:
        return self.recovery_status in ("IMPROVING", "CURED")

    @property
    def needs_attention(self) -> bool:
        return self.recovery_status in ("DETERIORATING", "NOT_ADHERING")

    @property
    def should_close_episode(self) -> bool:
        return self.episode_close_recommended and self.recovery_status == "CURED"


@dataclass
class FollowUpInput:
    """Input context for the follow-up monitoring agent."""

    patient_response: str = ""
    episode_details: dict = field(default_factory=dict)
    medicine_schedule: list = field(default_factory=list)
    followup_history: list = field(default_factory=list)
    days_since_start: int = 0
    original_severity: str = "LOW"
    detected_language: str = "english"


class FollowUpAgent:
    """
    Follow-up monitoring agent that tracks patient recovery daily.

    Usage:
        agent = FollowUpAgent(llm_client=your_llm_client)
        result = agent.check_in(followup_input)
    """

    def __init__(self, llm_client=None):
        """
        Initialize the follow-up agent.

        Args:
            llm_client: Any LLM client that implements a `chat(messages)` method
                        returning a string response.
        """
        self.llm_client = llm_client
        self.system_prompt = FOLLOWUP_SYSTEM_PROMPT

    def build_user_message(self, followup_input: FollowUpInput) -> str:
        """Format the user message from follow-up input data."""
        return FOLLOWUP_USER_TEMPLATE.format(
            patient_response=followup_input.patient_response,
            episode_json=json.dumps(followup_input.episode_details, indent=2),
            medicine_schedule_json=json.dumps(
                followup_input.medicine_schedule, indent=2
            ),
            followup_history_json=json.dumps(
                followup_input.followup_history, indent=2
            ),
            days_since_start=followup_input.days_since_start,
            original_severity=followup_input.original_severity,
            detected_language=followup_input.detected_language,
        )

    def check_in(self, followup_input: FollowUpInput) -> FollowUpResult:
        """
        Analyze patient's daily check-in and determine next action.

        Args:
            followup_input: Structured input with patient response and history.

        Returns:
            FollowUpResult with recovery status and next steps.

        Raises:
            RuntimeError: If no LLM client is configured.
            ValueError: If the LLM response cannot be parsed as valid JSON.
        """
        if self.llm_client is None:
            raise RuntimeError(
                "No LLM client configured. Pass an llm_client to FollowUpAgent()."
            )

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": self.build_user_message(followup_input)},
        ]

        raw_response = self.llm_client.chat(messages)
        return self._parse_response(raw_response)

    def _parse_response(self, raw: str) -> FollowUpResult:
        """Parse the LLM JSON response into a FollowUpResult."""
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            raise ValueError(f"LLM returned invalid JSON: {e}\nRaw: {raw}")

        # Validate recovery_status
        recovery_status = data.get("recovery_status", "STABLE").upper()
        if recovery_status not in VALID_RECOVERY_STATUSES:
            recovery_status = "STABLE"

        # Validate action_required
        action_required = data.get("action_required", "continue").lower()
        if action_required not in VALID_ACTIONS:
            action_required = "continue"

        # Validate symptom_trend
        symptom_trend = data.get("symptom_trend", "stable").lower()
        if symptom_trend not in VALID_TRENDS:
            symptom_trend = "stable"

        # Clamp numeric values
        adherence = data.get("medicine_adherence_percent", 0)
        try:
            adherence = max(0, min(100, int(adherence)))
        except (TypeError, ValueError):
            adherence = 0

        pain_score = data.get("pain_score_today", 0)
        try:
            pain_score = max(0, min(10, int(pain_score)))
        except (TypeError, ValueError):
            pain_score = 0

        days_since_start = data.get("days_since_start", 0)
        try:
            days_since_start = int(days_since_start)
        except (TypeError, ValueError):
            days_since_start = 0

        estimated_remaining = data.get("estimated_recovery_days_remaining")
        if estimated_remaining is not None:
            try:
                estimated_remaining = int(estimated_remaining)
            except (TypeError, ValueError):
                estimated_remaining = None

        return FollowUpResult(
            recovery_status=recovery_status,
            medicine_adherence_percent=adherence,
            symptom_trend=symptom_trend,
            pain_score_today=pain_score,
            action_required=action_required,
            escalate_to_emergency=data.get("escalate_to_emergency", False),
            patient_message=data.get("patient_message", ""),
            next_checkin_questions=data.get("next_checkin_questions", []),
            days_since_start=days_since_start,
            estimated_recovery_days_remaining=estimated_remaining,
            episode_close_recommended=data.get("episode_close_recommended", False),
        )

    def format_for_patient(self, result: FollowUpResult) -> str:
        """
        Format the follow-up result as a patient-facing message.

        Args:
            result: The follow-up result.

        Returns:
            A warm, readable message for the patient.
        """
        lines = []

        # Status emoji
        status_emoji = {
            "IMPROVING": "🟢",
            "STABLE": "🟡",
            "DETERIORATING": "🔴",
            "NOT_ADHERING": "⚠️",
            "CURED": "🎉",
        }
        emoji = status_emoji.get(result.recovery_status, "🟡")

        lines.append(f"{emoji} Day {result.days_since_start} Check-In")
        lines.append("-" * 35)

        # Patient message from LLM
        if result.patient_message:
            lines.append(result.patient_message)
            lines.append("")

        # Recovery stats
        lines.append(f"  Status: {result.recovery_status.replace('_', ' ').title()}")
        lines.append(f"  Symptom trend: {result.symptom_trend}")
        lines.append(f"  Pain score: {result.pain_score_today}/10")
        lines.append(f"  Medicine adherence: {result.medicine_adherence_percent}%")

        if result.estimated_recovery_days_remaining is not None:
            lines.append(
                f"  Estimated recovery: ~{result.estimated_recovery_days_remaining} days"
            )

        lines.append("")

        # Emergency escalation
        if result.is_emergency:
            lines.append(
                "🚨 URGENT: Your symptoms need immediate attention. "
                "Please call 108 or go to the nearest emergency room."
            )
            return "\n".join(lines)

        # Next check-in questions
        if result.next_checkin_questions:
            lines.append("Tomorrow we'll ask you:")
            for q in result.next_checkin_questions:
                lines.append(f"  • {q}")

        # Episode close
        if result.should_close_episode:
            lines.append("")
            lines.append(
                "✅ You seem fully recovered! We'll close this episode. "
                "Take care and reach out anytime you need help."
            )

        return "\n".join(lines)
