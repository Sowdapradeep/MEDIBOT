"""
MediBot Prescription Parsing Agent
Extracts structured medicine data from raw OCR text and builds reminder schedules.
"""

import json
from dataclasses import dataclass, field
from typing import Optional

from medibot.prompts import PRESCRIPTION_SYSTEM_PROMPT, PRESCRIPTION_USER_TEMPLATE


# Default reminder times based on frequency and food instruction
DEFAULT_REMINDER_TIMES = {
    "OD": {
        "before": ["07:30"],
        "after": ["09:00"],
        "with": ["08:00"],
        "any": ["08:00"],
    },
    "BD": {
        "before": ["07:30", "19:30"],
        "after": ["09:00", "21:00"],
        "with": ["08:00", "20:00"],
        "any": ["08:00", "20:00"],
    },
    "TID": {
        "before": ["07:30", "12:30", "19:30"],
        "after": ["09:00", "14:00", "21:00"],
        "with": ["08:00", "13:00", "20:00"],
        "any": ["08:00", "14:00", "20:00"],
    },
    "QID": {
        "before": ["07:30", "12:30", "17:30", "21:30"],
        "after": ["09:00", "14:00", "18:00", "22:00"],
        "with": ["08:00", "13:00", "18:00", "22:00"],
        "any": ["08:00", "13:00", "18:00", "22:00"],
    },
    "SOS": {
        "before": [],
        "after": [],
        "with": [],
        "any": [],
    },
}

VALID_FREQUENCIES = ["OD", "BD", "TID", "TDS", "QID", "SOS"]
VALID_FOOD_INSTRUCTIONS = ["before", "after", "with", "any"]
VALID_OCR_QUALITY = ["good", "fair", "poor"]


@dataclass
class Medicine:
    """A single extracted medicine entry."""

    brand_name: Optional[str] = None
    generic_name: Optional[str] = None
    dosage: str = ""
    frequency: str = "OD"
    duration_days: Optional[int] = None
    food_instruction: str = "any"
    special_instructions: Optional[str] = None
    reminder_times: list = field(default_factory=list)
    confidence: float = 0.0

    @property
    def display_name(self) -> str:
        """Best available name for display."""
        if self.brand_name:
            return self.brand_name
        if self.generic_name:
            return self.generic_name
        return "Unknown medicine"

    @property
    def needs_review(self) -> bool:
        """Flag if confidence is too low for safe use."""
        return self.confidence < 0.7

    @property
    def frequency_label(self) -> str:
        """Human-readable frequency."""
        labels = {
            "OD": "Once daily",
            "BD": "Twice daily",
            "TID": "Three times daily",
            "TDS": "Three times daily",
            "QID": "Four times daily",
            "SOS": "As needed",
        }
        return labels.get(self.frequency, self.frequency)


@dataclass
class PrescriptionResult:
    """Parsed prescription extraction result."""

    medicines: list = field(default_factory=list)
    doctor_name: Optional[str] = None
    prescription_date: Optional[str] = None
    diagnosis_noted: Optional[str] = None
    follow_up_date: Optional[str] = None
    needs_pharmacist_review: bool = False
    ocr_quality: str = "fair"
    raw_text_used: str = ""

    @property
    def medicine_count(self) -> int:
        return len(self.medicines)

    @property
    def has_low_confidence(self) -> bool:
        """True if any medicine has confidence < 0.7."""
        return any(m.confidence < 0.7 for m in self.medicines)

    @property
    def all_reminder_times(self) -> list:
        """Flat sorted list of all unique reminder times across medicines."""
        times = set()
        for med in self.medicines:
            for t in med.reminder_times:
                times.add(t)
        return sorted(times)


@dataclass
class PrescriptionInput:
    """Input context for the prescription parsing agent."""

    textract_raw_text: str = ""
    known_conditions: str = "None reported"
    current_medicines: str = "None reported"
    episode_context: str = ""


class PrescriptionAgent:
    """
    Prescription parsing agent that extracts medicine data from OCR text.

    Usage:
        agent = PrescriptionAgent(llm_client=your_llm_client)
        result = agent.parse(prescription_input)
    """

    def __init__(self, llm_client=None):
        """
        Initialize the prescription agent.

        Args:
            llm_client: Any LLM client that implements a `chat(messages)` method
                        returning a string response.
        """
        self.llm_client = llm_client
        self.system_prompt = PRESCRIPTION_SYSTEM_PROMPT

    def build_user_message(self, prescription_input: PrescriptionInput) -> str:
        """Format the user message from prescription input data."""
        return PRESCRIPTION_USER_TEMPLATE.format(
            textract_raw_text=prescription_input.textract_raw_text,
            known_conditions=prescription_input.known_conditions,
            current_medicines=prescription_input.current_medicines,
            episode_context=prescription_input.episode_context,
        )

    def parse(self, prescription_input: PrescriptionInput) -> PrescriptionResult:
        """
        Parse raw OCR text into structured prescription data.

        Args:
            prescription_input: Structured input with OCR text and patient context.

        Returns:
            PrescriptionResult with extracted medicines and metadata.

        Raises:
            RuntimeError: If no LLM client is configured.
            ValueError: If the LLM response cannot be parsed as valid JSON.
        """
        if self.llm_client is None:
            raise RuntimeError(
                "No LLM client configured. Pass an llm_client to PrescriptionAgent()."
            )

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": self.build_user_message(prescription_input)},
        ]

        raw_response = self.llm_client.chat(messages)
        return self._parse_response(raw_response)

    def _parse_response(self, raw: str) -> PrescriptionResult:
        """Parse the LLM JSON response into a PrescriptionResult."""
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            raise ValueError(f"LLM returned invalid JSON: {e}\nRaw: {raw}")

        # Parse medicines
        medicines = []
        for med_data in data.get("medicines", []):
            frequency = med_data.get("frequency", "OD").upper()
            # Normalize TDS to TID for lookup
            freq_key = "TID" if frequency == "TDS" else frequency
            if freq_key not in DEFAULT_REMINDER_TIMES:
                freq_key = "OD"

            food_instruction = med_data.get("food_instruction", "any").lower()
            if food_instruction not in VALID_FOOD_INSTRUCTIONS:
                food_instruction = "any"

            # Use LLM-provided reminder times or fall back to defaults
            reminder_times = med_data.get("reminder_times", [])
            if not reminder_times:
                reminder_times = DEFAULT_REMINDER_TIMES.get(freq_key, {}).get(
                    food_instruction, []
                )

            confidence = med_data.get("confidence", 0.0)
            confidence = max(0.0, min(1.0, float(confidence)))

            duration = med_data.get("duration_days")
            if duration is not None:
                try:
                    duration = int(duration)
                except (TypeError, ValueError):
                    duration = None

            medicines.append(
                Medicine(
                    brand_name=med_data.get("brand_name"),
                    generic_name=med_data.get("generic_name"),
                    dosage=med_data.get("dosage", ""),
                    frequency=frequency,
                    duration_days=duration,
                    food_instruction=food_instruction,
                    special_instructions=med_data.get("special_instructions"),
                    reminder_times=reminder_times,
                    confidence=confidence,
                )
            )

        # Validate OCR quality
        ocr_quality = data.get("ocr_quality", "fair").lower()
        if ocr_quality not in VALID_OCR_QUALITY:
            ocr_quality = "fair"

        return PrescriptionResult(
            medicines=medicines,
            doctor_name=data.get("doctor_name"),
            prescription_date=data.get("prescription_date"),
            diagnosis_noted=data.get("diagnosis_noted"),
            follow_up_date=data.get("follow_up_date"),
            needs_pharmacist_review=data.get("needs_pharmacist_review", False),
            ocr_quality=ocr_quality,
            raw_text_used=data.get("raw_text_used", ""),
        )

    def format_reminder_schedule(self, result: PrescriptionResult) -> str:
        """
        Format a daily reminder schedule for the patient.

        Args:
            result: The prescription result.

        Returns:
            A readable daily medicine schedule.
        """
        lines = []
        lines.append("💊 Your Daily Medicine Schedule")
        lines.append("-" * 35)

        if not result.medicines:
            lines.append("  No medicines extracted.")
            return "\n".join(lines)

        # Group by reminder time
        schedule = {}
        for med in result.medicines:
            if med.frequency == "SOS":
                continue  # SOS medicines don't have fixed times
            for time in med.reminder_times:
                if time not in schedule:
                    schedule[time] = []
                entry = f"{med.display_name} {med.dosage}"
                if med.food_instruction != "any":
                    entry += f" ({med.food_instruction} food)"
                schedule[time].append(entry)

        # Print sorted schedule
        for time in sorted(schedule.keys()):
            lines.append(f"\n  🕐 {time}")
            for entry in schedule[time]:
                lines.append(f"    • {entry}")

        # SOS medicines
        sos_meds = [m for m in result.medicines if m.frequency == "SOS"]
        if sos_meds:
            lines.append("\n  📌 Take as needed:")
            for med in sos_meds:
                entry = f"{med.display_name} {med.dosage}"
                if med.special_instructions:
                    entry += f" — {med.special_instructions}"
                lines.append(f"    • {entry}")

        # Warnings
        if result.needs_pharmacist_review:
            lines.append(
                "\n  ⚠️ Some medicines could not be read clearly. "
                "Please verify with your pharmacist."
            )

        if result.follow_up_date:
            lines.append(f"\n  📅 Follow-up: {result.follow_up_date}")

        return "\n".join(lines)

    def format_for_patient(self, result: PrescriptionResult) -> str:
        """
        Format a simple medicine list for the patient.

        Args:
            result: The prescription result.

        Returns:
            A readable medicine summary.
        """
        lines = []
        lines.append("📋 Your Medicines")
        lines.append("-" * 35)

        if result.doctor_name:
            lines.append(f"  Prescribed by: {result.doctor_name}")
        if result.prescription_date:
            lines.append(f"  Date: {result.prescription_date}")
        if result.diagnosis_noted:
            lines.append(f"  For: {result.diagnosis_noted}")
        lines.append("")

        for i, med in enumerate(result.medicines, 1):
            lines.append(f"  {i}. {med.display_name} — {med.dosage}")
            lines.append(f"     {med.frequency_label}, {med.food_instruction} food")
            if med.duration_days:
                lines.append(f"     Duration: {med.duration_days} days")
            if med.special_instructions:
                lines.append(f"     Note: {med.special_instructions}")
            if med.needs_review:
                lines.append("     ⚠️ Low confidence — verify with pharmacist")
            lines.append("")

        return "\n".join(lines)
