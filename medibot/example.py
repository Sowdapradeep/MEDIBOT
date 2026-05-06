"""
Example usage of the full MediBot pipeline:
  Triage → Decision → Suggestion → Doctor Rec → Booking → Health Record

Replace Mock*LLM classes with your actual LLM integration (OpenAI, Bedrock, etc.).
"""

import json

from medibot.triage_agent import PatientInput, TriageAgent
from medibot.decision_agent import DecisionAgent, DecisionInput
from medibot.suggestion_agent import SuggestionAgent, SuggestionInput
from medibot.doctor_rec_agent import DoctorRecAgent, DoctorRecInput
from medibot.booking_agent import BookingAgent, BookingInput
from medibot.health_record_agent import HealthRecordAgent, HealthRecordInput


class MockTriageLLM:
    def chat(self, messages: list) -> str:
        return json.dumps(
            {
                "body_system": "respiratory",
                "possible_condition_category": "upper respiratory infection",
                "key_symptoms_identified": ["cough", "fever", "sore throat"],
                "clarifying_questions": [],
                "detected_language": "english",
                "confidence": 0.85,
                "notes": "Common cold or viral pharyngitis likely",
            }
        )


class MockDecisionLLM:
    def chat(self, messages: list) -> str:
        return json.dumps(
            {
                "severity": "MEDIUM",
                "urgency_hours": 24,
                "reasoning": "Persistent cough with fever for 3 days warrants evaluation to rule out bacterial infection.",
                "escalate_to_emergency": False,
                "recommended_specialist_type": "general physician",
                "risk_factors_identified": ["fever duration"],
                "contraindications": [],
            }
        )


class MockSuggestionLLM:
    def chat(self, messages: list) -> str:
        return json.dumps(
            {
                "severity_acknowledged": "MEDIUM",
                "immediate_actions": [
                    "Rest your voice and stay in bed",
                    "Drink warm water with honey every 2 hours",
                ],
                "home_care_instructions": [
                    "Gargle with warm salt water 3 times a day",
                    "Steam inhalation for 10 minutes before bed",
                    "Eat light, warm food like khichdi or soup",
                ],
                "what_to_avoid": [
                    "Cold drinks and ice cream",
                    "Dusty or smoky areas",
                    "Talking too much or shouting",
                ],
                "warning_signs": [
                    "Fever goes above 103°F or lasts more than 5 days",
                    "You start having difficulty breathing",
                    "You cough up blood or green/yellow mucus",
                ],
                "otc_suggestions": [
                    "Paracetamol 500mg if fever is above 100°F (max 3 times a day)"
                ],
                "reassurance_message": "Don't worry — most coughs like this get better in a few days with rest and fluids. But do see a doctor soon to be safe.",
                "follow_up_in_hours": 24,
            }
        )


class MockDoctorRecLLM:
    def chat(self, messages: list) -> str:
        return json.dumps(
            {
                "primary_specialty": "General Physician",
                "secondary_specialty": "Pulmonologist",
                "rural_fallback": "General Physician at nearest PHC",
                "specialty_reasoning": "Mild respiratory symptoms best handled by GP first; pulmonologist if no improvement.",
                "urgency_context": "Book appointment within 24 hours",
                "search_keywords": ["general physician", "GP clinic", "fever doctor"],
                "telemedicine_suitable": True,
                "home_visit_suitable": False,
            }
        )


class MockBookingLLM:
    def chat(self, messages: list) -> str:
        return json.dumps(
            {
                "recommended_booking": {
                    "doctor_id": "DOC-1042",
                    "doctor_name": "Dr. Priya Sharma",
                    "specialty": "General Physician",
                    "hospital_name": "Apollo Clinic, Anna Nagar",
                    "slot_time": "2026-05-07T10:30:00+05:30",
                    "distance_km": 3.2,
                    "match_score": 0.92,
                },
                "alternatives": [
                    {
                        "doctor_id": "DOC-2087",
                        "slot_time": "2026-05-07T14:00:00+05:30",
                        "reason": "Closer (1.5 km) but afternoon slot only",
                    },
                    {
                        "doctor_id": "DOC-3011",
                        "slot_time": "2026-05-07T09:00:00+05:30",
                        "reason": "Pulmonologist — if GP referral needed later",
                    },
                ],
                "needs_emergency_redirect": False,
                "booking_urgency_met": True,
                "confirmation_message": "We found a great doctor near you. Dr. Priya Sharma is available tomorrow morning — shall we book it?",
                "preparation_instructions": [
                    "Bring any previous prescriptions",
                    "Note down when the fever started and highest temperature",
                    "Carry your Aadhaar or insurance card",
                ],
            }
        )


class MockHealthRecordLLM:
    def chat(self, messages: list) -> str:
        return json.dumps(
            {
                "episode_summary": "You came in with a cough, mild fever, and sore throat that started 3 days ago. We've booked you with Dr. Priya Sharma tomorrow morning at Apollo Clinic.",
                "doctor_brief": "32M presenting with 3-day history of productive cough, low-grade fever, and pharyngitis. No red flags. Severity: MEDIUM. Likely viral URI. Appointment booked within urgency window.",
                "structured_record": {
                    "chief_complaint": "Cough with fever and sore throat for 3 days",
                    "symptom_onset": "3 days ago",
                    "severity_at_intake": "MEDIUM",
                    "body_system": "respiratory",
                    "possible_condition": "upper respiratory infection",
                    "action_taken": "booked_appointment",
                },
                "always_show_to_doctor": {
                    "known_allergies": [],
                    "current_medications": ["Paracetamol 500mg"],
                    "past_surgeries": [],
                    "chronic_conditions": [],
                },
                "pattern_flags": [
                    "Second respiratory episode in 4 months — consider environmental triggers"
                ],
                "qr_data_scope": [
                    "chief_complaint",
                    "doctor_brief",
                    "always_show_to_doctor",
                    "pattern_flags",
                ],
            }
        )


def main():
    # Patient intake
    patient = PatientInput(
        patient_input="I have been coughing for 3 days with mild fever and sore throat",
        input_method="text",
        age=32,
        gender="male",
        known_conditions="None",
        current_medicines="Paracetamol 500mg",
    )

    # --- Step 1: Triage ---
    triage_agent = TriageAgent(llm_client=MockTriageLLM())
    triage_result = triage_agent.classify(patient)

    print("=" * 55)
    print("  STEP 1: TRIAGE — What's wrong?")
    print("=" * 55)
    print(f"  Body System:  {triage_result.body_system}")
    print(f"  Category:     {triage_result.possible_condition_category}")
    print(f"  Symptoms:     {triage_result.key_symptoms_identified}")
    print(f"  Confidence:   {triage_result.confidence}")
    print(f"  Emergency:    {triage_result.is_emergency}")
    print()

    # --- Step 2: Decision ---
    decision_agent = DecisionAgent(llm_client=MockDecisionLLM())
    decision_input = DecisionInput(
        triage_result=triage_result,
        age=patient.age,
        gender=patient.gender,
        known_conditions=patient.known_conditions,
        current_medicines=patient.current_medicines,
        symptom_duration="3 days",
    )
    decision_result = decision_agent.assess(decision_input)

    print("=" * 55)
    print("  STEP 2: DECISION — How serious is it?")
    print("=" * 55)
    print(f"  Severity:     {decision_result.severity}")
    print(f"  Urgency:      {decision_result.urgency_hours} hours")
    print(f"  Reasoning:    {decision_result.reasoning}")
    print(f"  Emergency:    {decision_result.needs_emergency}")
    print(f"  Specialist:   {decision_result.recommended_specialist_type}")
    print()

    # --- Step 3: Suggestion ---
    suggestion_agent = SuggestionAgent(llm_client=MockSuggestionLLM())
    suggestion_input = SuggestionInput(
        triage_result=triage_result,
        decision_result=decision_result,
        age=patient.age,
        detected_language="english",
    )
    suggestion_result = suggestion_agent.suggest(suggestion_input)

    print("=" * 55)
    print("  STEP 3: SUGGESTION — What should the patient do?")
    print("=" * 55)
    print()
    print(suggestion_agent.format_for_patient(suggestion_result))
    print()

    # --- Step 4: Doctor Recommendation ---
    doctor_rec_agent = DoctorRecAgent(llm_client=MockDoctorRecLLM())
    doctor_rec_input = DoctorRecInput(
        decision_result=decision_result,
        body_system=triage_result.body_system,
        age=patient.age,
        gender=patient.gender,
        known_conditions=patient.known_conditions,
        location_type="semi-urban",
    )
    doctor_rec_result = doctor_rec_agent.recommend(doctor_rec_input)

    print("=" * 55)
    print("  STEP 4: DOCTOR RECOMMENDATION — Who to see?")
    print("=" * 55)
    print()
    print(doctor_rec_agent.format_for_patient(doctor_rec_result))
    print()

    # --- Step 5: Booking ---
    booking_agent = BookingAgent(llm_client=MockBookingLLM())
    available_doctors = [
        {
            "doctor_id": "DOC-1042",
            "name": "Dr. Priya Sharma",
            "specialty": "General Physician",
            "hospital": "Apollo Clinic, Anna Nagar",
            "lat": 13.085,
            "lng": 80.218,
            "rating": 4.6,
            "languages": ["english", "tamil", "hindi"],
            "next_slot": "2026-05-07T10:30:00+05:30",
        },
        {
            "doctor_id": "DOC-2087",
            "name": "Dr. Ravi Kumar",
            "specialty": "General Physician",
            "hospital": "Kauvery Hospital, Vadapalani",
            "lat": 13.052,
            "lng": 80.212,
            "rating": 4.3,
            "languages": ["english", "tamil"],
            "next_slot": "2026-05-07T14:00:00+05:30",
        },
        {
            "doctor_id": "DOC-3011",
            "name": "Dr. Meena Iyer",
            "specialty": "Pulmonologist",
            "hospital": "MIOT International",
            "lat": 13.012,
            "lng": 80.178,
            "rating": 4.8,
            "languages": ["english", "hindi"],
            "next_slot": "2026-05-07T09:00:00+05:30",
        },
    ]
    booking_input = BookingInput(
        decision_result=decision_result,
        doctor_rec_result=doctor_rec_result,
        lat=13.07,
        lng=80.22,
        detected_language="english",
        available_doctors=available_doctors,
        episode_id="EP-20260506-0032",
    )
    booking_result = booking_agent.book(booking_input)

    print("=" * 55)
    print("  STEP 5: BOOKING — Schedule the appointment")
    print("=" * 55)
    print()
    print(booking_agent.format_for_patient(booking_result))
    print()

    # --- Step 6: Health Record ---
    health_record_agent = HealthRecordAgent(llm_client=MockHealthRecordLLM())
    health_record_input = HealthRecordInput(
        patient_id="PAT-00032",
        episode_id="EP-20260506-0032",
        triage_result=triage_result,
        decision_result=decision_result,
        booking_result=booking_result,
        past_episodes=[
            {
                "episode_id": "EP-20260115-0032",
                "date": "2026-01-15",
                "body_system": "respiratory",
                "severity": "LOW",
                "condition": "common cold",
                "action": "home_care",
            }
        ],
        patient_profile={
            "name": "Arjun Mehta",
            "age": 32,
            "gender": "male",
            "blood_group": "B+",
            "allergies": [],
            "chronic_conditions": [],
        },
    )
    health_record_result = health_record_agent.create_record(health_record_input)

    print("=" * 55)
    print("  STEP 6: HEALTH RECORD — Save & summarize")
    print("=" * 55)
    print()
    print(health_record_agent.format_for_patient(health_record_result))
    print()
    print(health_record_agent.format_for_doctor(health_record_result))
    print()

    # QR payload for doctor's quick scan
    print("  QR Code Payload:")
    print(f"  {json.dumps(health_record_result.qr_payload, indent=2)}")


if __name__ == "__main__":
    main()
