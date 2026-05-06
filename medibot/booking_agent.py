"""
MediBot Booking Agent
Ranks available doctors and generates appointment booking recommendations.
"""

import json
from dataclasses import dataclass, field
from typing import Optional

from medibot.prompts import BOOKING_SYSTEM_PROMPT, BOOKING_USER_TEMPLATE
from medibot.decision_agent import DecisionResult
from medibot.doctor_rec_agent import DoctorRecResult


@dataclass
class BookingSlot:
    """A single recommended booking slot."""

    doctor_id: str = ""
    doctor_name: str = ""
    specialty: str = ""
    hospital_name: str = ""
    slot_time: str = ""
    distance_km: float = 0.0
    match_score: float = 0.0


@dataclass
class BookingAlternative:
    """An alternative booking option."""

    doctor_id: str = ""
    slot_time: str = ""
    reason: str = ""


@dataclass
class BookingResult:
    """Parsed booking recommendation result."""

    recommended_booking: Optional[BookingSlot] = None
    alternatives: list = field(default_factory=list)
    needs_emergency_redirect: bool = False
    booking_urgency_met: bool = True
    confirmation_message: str = ""
    preparation_instructions: list = field(default_factory=list)

    @property
    def is_booked(self) -> bool:
        return self.recommended_booking is not None and self.booking_urgency_met

    @property
    def needs_redirect(self) -> bool:
        return self.needs_emergency_redirect


@dataclass
class BookingInput:
    """Input context for the booking agent."""

    decision_result: DecisionResult
    doctor_rec_result: DoctorRecResult
    lat: float = 0.0
    lng: float = 0.0
    detected_language: str = "english"
    available_doctors: list = field(default_factory=list)
    episode_id: str = ""


class BookingAgent:
    """
    Booking agent that ranks doctors and generates appointment recommendations.

    Usage:
        agent = BookingAgent(llm_client=your_llm_client)
        result = agent.book(booking_input)
    """

    def __init__(self, llm_client=None):
        """
        Initialize the booking agent.

        Args:
            llm_client: Any LLM client that implements a `chat(messages)` method
                        returning a string response.
        """
        self.llm_client = llm_client
        self.system_prompt = BOOKING_SYSTEM_PROMPT

    def build_user_message(self, booking_input: BookingInput) -> str:
        """Format the user message from booking input data."""
        return BOOKING_USER_TEMPLATE.format(
            primary_specialty=booking_input.doctor_rec_result.primary_specialty,
            severity=booking_input.decision_result.severity,
            urgency_hours=booking_input.decision_result.urgency_hours or "No deadline",
            lat=booking_input.lat,
            lng=booking_input.lng,
            detected_language=booking_input.detected_language,
            available_doctors_json=json.dumps(
                booking_input.available_doctors, indent=2
            ),
            episode_id=booking_input.episode_id,
        )

    def book(self, booking_input: BookingInput) -> BookingResult:
        """
        Generate a booking recommendation from available doctors.

        Args:
            booking_input: Structured input with decision/rec results and doctor list.

        Returns:
            BookingResult with recommended slot and alternatives.

        Raises:
            RuntimeError: If no LLM client is configured.
            ValueError: If the LLM response cannot be parsed as valid JSON.
        """
        if self.llm_client is None:
            raise RuntimeError(
                "No LLM client configured. Pass an llm_client to BookingAgent()."
            )

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": self.build_user_message(booking_input)},
        ]

        raw_response = self.llm_client.chat(messages)
        return self._parse_response(raw_response)

    def _parse_response(self, raw: str) -> BookingResult:
        """Parse the LLM JSON response into a BookingResult."""
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            raise ValueError(f"LLM returned invalid JSON: {e}\nRaw: {raw}")

        # Parse recommended booking
        rec_data = data.get("recommended_booking")
        recommended_booking = None
        if rec_data:
            match_score = rec_data.get("match_score", 0.0)
            match_score = max(0.0, min(1.0, float(match_score)))

            recommended_booking = BookingSlot(
                doctor_id=rec_data.get("doctor_id", ""),
                doctor_name=rec_data.get("doctor_name", ""),
                specialty=rec_data.get("specialty", ""),
                hospital_name=rec_data.get("hospital_name", ""),
                slot_time=rec_data.get("slot_time", ""),
                distance_km=float(rec_data.get("distance_km", 0.0)),
                match_score=match_score,
            )

        # Parse alternatives
        alternatives = []
        for alt_data in data.get("alternatives", []):
            alternatives.append(
                BookingAlternative(
                    doctor_id=alt_data.get("doctor_id", ""),
                    slot_time=alt_data.get("slot_time", ""),
                    reason=alt_data.get("reason", ""),
                )
            )

        return BookingResult(
            recommended_booking=recommended_booking,
            alternatives=alternatives,
            needs_emergency_redirect=data.get("needs_emergency_redirect", False),
            booking_urgency_met=data.get("booking_urgency_met", True),
            confirmation_message=data.get("confirmation_message", ""),
            preparation_instructions=data.get("preparation_instructions", []),
        )

    def format_for_patient(self, result: BookingResult) -> str:
        """
        Format the booking result into a patient-friendly message.

        Args:
            result: The booking result.

        Returns:
            A readable message with booking details.
        """
        lines = []

        # Emergency redirect
        if result.needs_redirect:
            lines.append(
                "⚠️ No available slot matches your urgency. "
                "Please go to the nearest emergency room or call 108."
            )
            return "\n".join(lines)

        # Confirmation message from LLM
        if result.confirmation_message:
            lines.append(result.confirmation_message)
            lines.append("")

        # Recommended booking
        if result.recommended_booking:
            slot = result.recommended_booking
            lines.append("📋 Recommended Appointment:")
            lines.append(f"  Doctor: {slot.doctor_name} ({slot.specialty})")
            lines.append(f"  Hospital: {slot.hospital_name}")
            lines.append(f"  Time: {slot.slot_time}")
            lines.append(f"  Distance: {slot.distance_km} km")
            lines.append(f"  Match: {int(slot.match_score * 100)}%")
            lines.append("")

        # Alternatives
        if result.alternatives:
            lines.append("Other options:")
            for i, alt in enumerate(result.alternatives, 1):
                lines.append(f"  {i}. {alt.slot_time} — {alt.reason}")
            lines.append("")

        # Preparation instructions
        if result.preparation_instructions:
            lines.append("Before your visit:")
            for instruction in result.preparation_instructions:
                lines.append(f"  • {instruction}")

        return "\n".join(lines)
