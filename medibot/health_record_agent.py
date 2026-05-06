"""
MediBot Health Record Agent
Structures episode data into permanent health records with patient and doctor views.
"""

import json
from dataclasses import dataclass, field
from typing import Optional

from medibot.prompts import HEALTH_RECORD_SYSTEM_PROMPT, HEALTH_RECORD_USER_TEMPLATE
from medibot.triage_agent import TriageResult
from medibot.decision_agent import DecisionResult
from medibot.booking_agent import BookingResult


@dataclass
class StructuredRecord:
    """Core clinical record for the episode."""

    chief_complaint: str = ""
    symptom_onset: str = ""
    severity_at_intake: str = "LOW"
    body_system: str = "general"
    possible_condition: str = ""
    action_taken: str = "home_care"


@dataclass
class DoctorContext:
    """Critical info that must always be shown to the doctor."""

    known_allergies: list = field(default_factory=list)
    current_medications: list = field(default_factory=list)
    past_surgeries: list = field(default_factory=list)
    chronic_conditions: list = field(default_factory=list)


@dataclass
class HealthRecordResult:
    """Parsed health record result."""

    episode_summary: str = ""
    doctor_brief: str = ""
    structured_record: Optional[StructuredRecord] = None
    always_show_to_doctor: Optional[DoctorContext] = None
    pattern_flags: list = field(default_factory=list)
    qr_data_scope: list = field(default_factory=list)

    @property
    def has_patterns(self) -> bool:
        return len(self.pattern_flags) > 0

    @property
    def qr_payload(self) -> dict:
        """Build the data payload for QR code generation."""
        payload = {}
        if self.structured_record and "chief_complaint" in self.qr_data_scope:
            payload["chief_complaint"] = self.structured_record.chief_complaint
        if "doctor_brief" in self.qr_data_scope:
            payload["doctor_brief"] = self.doctor_brief
        if self.always_show_to_doctor and "always_show_to_doctor" in self.qr_data_scope:
            payload["always_show_to_doctor"] = {
                "known_allergies": self.always_show_to_doctor.known_allergies,
                "current_medications": self.always_show_to_doctor.current_medications,
                "past_surgeries": self.always_show_to_doctor.past_surgeries,
                "chronic_conditions": self.always_show_to_doctor.chronic_conditions,
            }
        if self.pattern_flags and "pattern_flags" in self.qr_data_scope:
            payload["pattern_flags"] = self.pattern_flags
        return payload


@dataclass
class HealthRecordInput:
    """Input context for the health record agent."""

    patient_id: str = ""
    episode_id: str = ""
    triage_result: Optional[TriageResult] = None
    decision_result: Optional[DecisionResult] = None
    booking_result: Optional[BookingResult] = None
    past_episodes: list = field(default_factory=list)
    patient_profile: dict = field(default_factory=dict)


class HealthRecordAgent:
    """
    Health record agent that structures episode data into permanent records.

    Usage:
        agent = HealthRecordAgent(llm_client=your_llm_client)
        result = agent.create_record(health_record_input)
    """

    def __init__(self, llm_client=None):
        """
        Initialize the health record agent.

        Args:
            llm_client: Any LLM client that implements a `chat(messages)` method
                        returning a string response.
        """
        self.llm_client = llm_client
        self.system_prompt = HEALTH_RECORD_SYSTEM_PROMPT

    def _format_triage_output(self, triage: Optional[TriageResult]) -> str:
        if triage is None:
            return "Not available"
        return json.dumps(
            {
                "body_system": triage.body_system,
                "possible_condition_category": triage.possible_condition_category,
                "key_symptoms_identified": triage.key_symptoms_identified,
                "confidence": triage.confidence,
                "immediate_flag": triage.immediate_flag,
            }
        )

    def _format_decision_output(self, decision: Optional[DecisionResult]) -> str:
        if decision is None:
            return "Not available"
        return json.dumps(
            {
                "severity": decision.severity,
                "urgency_hours": decision.urgency_hours,
                "reasoning": decision.reasoning,
                "escalate_to_emergency": decision.escalate_to_emergency,
                "recommended_specialist_type": decision.recommended_specialist_type,
                "risk_factors_identified": decision.risk_factors_identified,
            }
        )

    def _format_booking_output(self, booking: Optional[BookingResult]) -> str:
        if booking is None:
            return "Not available"
        data = {
            "needs_emergency_redirect": booking.needs_emergency_redirect,
            "booking_urgency_met": booking.booking_urgency_met,
        }
        if booking.recommended_booking:
            data["booked_doctor"] = booking.recommended_booking.doctor_name
            data["booked_hospital"] = booking.recommended_booking.hospital_name
            data["booked_time"] = booking.recommended_booking.slot_time
        return json.dumps(data)

    def build_user_message(self, record_input: HealthRecordInput) -> str:
        """Format the user message from health record input data."""
        return HEALTH_RECORD_USER_TEMPLATE.format(
            patient_id=record_input.patient_id,
            episode_id=record_input.episode_id,
            triage_output=self._format_triage_output(record_input.triage_result),
            decision_output=self._format_decision_output(record_input.decision_result),
            booking_output=self._format_booking_output(record_input.booking_result),
            past_episodes_json=json.dumps(record_input.past_episodes, indent=2),
            patient_profile_json=json.dumps(record_input.patient_profile, indent=2),
        )

    def create_record(self, record_input: HealthRecordInput) -> HealthRecordResult:
        """
        Create a structured health record from episode data.

        Args:
            record_input: Structured input with all episode outputs and patient history.

        Returns:
            HealthRecordResult with patient summary, doctor brief, and structured record.

        Raises:
            RuntimeError: If no LLM client is configured.
            ValueError: If the LLM response cannot be parsed as valid JSON.
        """
        if self.llm_client is None:
            raise RuntimeError(
                "No LLM client configured. Pass an llm_client to HealthRecordAgent()."
            )

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": self.build_user_message(record_input)},
        ]

        raw_response = self.llm_client.chat(messages)
        return self._parse_response(raw_response)

    def _parse_response(self, raw: str) -> HealthRecordResult:
        """Parse the LLM JSON response into a HealthRecordResult."""
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            raise ValueError(f"LLM returned invalid JSON: {e}\nRaw: {raw}")

        # Parse structured_record
        sr_data = data.get("structured_record", {})
        structured_record = StructuredRecord(
            chief_complaint=sr_data.get("chief_complaint", ""),
            symptom_onset=sr_data.get("symptom_onset", ""),
            severity_at_intake=sr_data.get("severity_at_intake", "LOW"),
            body_system=sr_data.get("body_system", "general"),
            possible_condition=sr_data.get("possible_condition", ""),
            action_taken=sr_data.get("action_taken", "home_care"),
        )

        # Parse always_show_to_doctor
        doc_data = data.get("always_show_to_doctor", {})
        doctor_context = DoctorContext(
            known_allergies=doc_data.get("known_allergies", []),
            current_medications=doc_data.get("current_medications", []),
            past_surgeries=doc_data.get("past_surgeries", []),
            chronic_conditions=doc_data.get("chronic_conditions", []),
        )

        return HealthRecordResult(
            episode_summary=data.get("episode_summary", ""),
            doctor_brief=data.get("doctor_brief", ""),
            structured_record=structured_record,
            always_show_to_doctor=doctor_context,
            pattern_flags=data.get("pattern_flags", []),
            qr_data_scope=data.get("qr_data_scope", []),
        )

    def format_for_patient(self, result: HealthRecordResult) -> str:
        """Format the record as a patient-facing summary."""
        lines = []

        lines.append("📋 Your Visit Summary")
        lines.append("-" * 30)

        if result.episode_summary:
            lines.append(result.episode_summary)
            lines.append("")

        if result.structured_record:
            sr = result.structured_record
            lines.append(f"  Concern: {sr.chief_complaint}")
            lines.append(f"  Started: {sr.symptom_onset}")
            lines.append(f"  Severity: {sr.severity_at_intake}")
            lines.append(f"  Action: {sr.action_taken.replace('_', ' ').title()}")
            lines.append("")

        if result.has_patterns:
            lines.append("⚠️ Patterns noticed:")
            for flag in result.pattern_flags:
                lines.append(f"  • {flag}")

        return "\n".join(lines)

    def format_for_doctor(self, result: HealthRecordResult) -> str:
        """Format the record as a doctor-facing clinical brief."""
        lines = []

        lines.append("🩺 Clinical Brief")
        lines.append("-" * 30)

        if result.doctor_brief:
            lines.append(result.doctor_brief)
            lines.append("")

        if result.always_show_to_doctor:
            ctx = result.always_show_to_doctor
            if ctx.known_allergies:
                lines.append(f"  Allergies: {', '.join(ctx.known_allergies)}")
            if ctx.current_medications:
                lines.append(f"  Medications: {', '.join(ctx.current_medications)}")
            if ctx.chronic_conditions:
                lines.append(f"  Chronic: {', '.join(ctx.chronic_conditions)}")
            if ctx.past_surgeries:
                lines.append(f"  Surgeries: {', '.join(ctx.past_surgeries)}")
            lines.append("")

        if result.has_patterns:
            lines.append("  Pattern Flags:")
            for flag in result.pattern_flags:
                lines.append(f"    ⚠ {flag}")

        return "\n".join(lines)
