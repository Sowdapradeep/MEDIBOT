"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getNearbyDoctors, bookAppointment } from "@/lib/api";
import { addAppointmentToStore } from "@/lib/appointments-store";
import Link from "next/link";

interface Doctor {
  doctor_id: string;
  name: string;
  specialization?: string;
  specialty?: string;
  hospital?: string;
  hospital_name?: string;
  consultation_fee?: number;
  rating?: number;
  languages?: string[];
  available_slots?: string[];
  distance_km?: number;
}

export default function BookAppointmentPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p>Loading...</p></div>}>
      <BookAppointmentContent />
    </Suspense>
  );
}

function BookAppointmentContent() {
  const searchParams = useSearchParams();
  const specialty = searchParams.get("specialty") || "General Physician";
  const severity = searchParams.get("severity") || "LOW";
  const urgency = searchParams.get("urgency") || "48";

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [booked, setBooked] = useState(false);
  const [error, setError] = useState("");

  // Generate next 7 days
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      value: d.toISOString().split("T")[0],
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
    };
  });

  // Time slots
  const timeSlots = [
    "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
    "11:00 AM", "11:30 AM", "12:00 PM",
    "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
    "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM",
    "06:00 PM", "06:30 PM", "07:00 PM",
  ];

  useEffect(() => {
    async function loadDoctors() {
      try {
        const res = await getNearbyDoctors({ specialty, lat: 13.07, lng: 80.22 });
        const apiDoctors = res.doctors || [];
        if (apiDoctors.length > 0) {
          setDoctors(apiDoctors);
          setLoading(false);
          return;
        }
      } catch {
        // API failed or returned empty — use mock data
      }

      // Mock doctors covering all major specialties
      const allDoctors: Doctor[] = [
          {
            doctor_id: "doc-001",
            name: "Dr. Priya Sharma",
            specialization: "General Physician",
            hospital: "Apollo Clinic, Anna Nagar",
            consultation_fee: 500,
            rating: 4.6,
            languages: ["English", "Tamil", "Hindi"],
          },
          {
            doctor_id: "doc-002",
            name: "Dr. Ravi Kumar",
            specialization: "General Physician",
            hospital: "Kauvery Hospital, Vadapalani",
            consultation_fee: 400,
            rating: 4.3,
            languages: ["English", "Tamil"],
          },
          {
            doctor_id: "doc-003",
            name: "Dr. Meena Iyer",
            specialization: "Pulmonologist",
            hospital: "MIOT International",
            consultation_fee: 800,
            rating: 4.8,
            languages: ["English", "Hindi"],
          },
          {
            doctor_id: "doc-004",
            name: "Dr. Suresh Babu",
            specialization: "Cardiologist",
            hospital: "Fortis Malar Hospital",
            consultation_fee: 1200,
            rating: 4.9,
            languages: ["English", "Tamil"],
          },
          {
            doctor_id: "doc-005",
            name: "Dr. Anitha Raj",
            specialization: "Dermatologist",
            hospital: "Skin & Hair Clinic, T. Nagar",
            consultation_fee: 600,
            rating: 4.5,
            languages: ["English", "Tamil", "Hindi"],
          },
          {
            doctor_id: "doc-006",
            name: "Dr. Karthik Venkatesh",
            specialization: "Orthopedic Surgeon",
            hospital: "SIMS Hospital, Vadapalani",
            consultation_fee: 900,
            rating: 4.7,
            languages: ["English", "Tamil"],
          },
          {
            doctor_id: "doc-007",
            name: "Dr. Lakshmi Narayanan",
            specialization: "Neurologist",
            hospital: "Apollo Hospitals, Greams Road",
            consultation_fee: 1500,
            rating: 4.9,
            languages: ["English", "Tamil", "Hindi"],
          },
          {
            doctor_id: "doc-008",
            name: "Dr. Fathima Begum",
            specialization: "Gastroenterologist",
            hospital: "MGM Healthcare, Nelson Manickam Road",
            consultation_fee: 1000,
            rating: 4.6,
            languages: ["English", "Tamil", "Urdu"],
          },
          {
            doctor_id: "doc-009",
            name: "Dr. Arun Prakash",
            specialization: "Ophthalmologist",
            hospital: "Sankara Nethralaya, Nungambakkam",
            consultation_fee: 700,
            rating: 4.8,
            languages: ["English", "Tamil", "Hindi"],
          },
          {
            doctor_id: "doc-010",
            name: "Dr. Deepa Mohan",
            specialization: "Psychiatrist",
            hospital: "NIMHANS Outreach, Adyar",
            consultation_fee: 800,
            rating: 4.4,
            languages: ["English", "Tamil"],
          },
          {
            doctor_id: "doc-011",
            name: "Dr. Rajesh Kannan",
            specialization: "Urologist",
            hospital: "Global Hospitals, Perumbakkam",
            consultation_fee: 1100,
            rating: 4.7,
            languages: ["English", "Tamil"],
          },
          {
            doctor_id: "doc-012",
            name: "Dr. Shalini Gupta",
            specialization: "Dentist",
            hospital: "Dental Planet, Velachery",
            consultation_fee: 350,
            rating: 4.5,
            languages: ["English", "Hindi", "Tamil"],
          },
          {
            doctor_id: "doc-013",
            name: "Dr. Venkat Ramanan",
            specialization: "ENT Specialist",
            hospital: "Billroth Hospitals, Shenoy Nagar",
            consultation_fee: 600,
            rating: 4.4,
            languages: ["English", "Tamil"],
          },
          {
            doctor_id: "doc-014",
            name: "Dr. Kavitha Sundaram",
            specialization: "Gynecologist",
            hospital: "Cloudnine Hospital, OMR",
            consultation_fee: 900,
            rating: 4.8,
            languages: ["English", "Tamil", "Hindi"],
          },
          {
            doctor_id: "doc-015",
            name: "Dr. Mohammed Irfan",
            specialization: "Physiotherapist",
            hospital: "PhysioActive Clinic, Alwarpet",
            consultation_fee: 500,
            rating: 4.3,
            languages: ["English", "Tamil", "Urdu"],
          },
        ];

        // Filter by requested specialty, but always include Dr. Priya Sharma
        const priya = allDoctors.find((d) => d.doctor_id === "doc-001")!;
        const filtered = allDoctors.filter(
          (d) => d.specialization?.toLowerCase() === specialty.toLowerCase()
        );
        // Ensure Dr. Priya is always in the list
        const hasPriya = filtered.some((d) => d.doctor_id === "doc-001");
        const finalList = hasPriya ? filtered : [priya, ...filtered];
        setDoctors(finalList.length > 0 ? finalList : [priya, ...allDoctors.slice(1, 4)]);
        setLoading(false);
    }
    loadDoctors();
  }, [specialty]);

  async function handleBook() {
    if (!selectedDoctor || !selectedDate || !selectedTime) {
      setError("Please select a doctor, date, and time slot");
      return;
    }

    setBooking(true);
    setError("");

    // Map doctor names to emails for the shared store
    const doctorEmails: Record<string, string> = {
      "Dr. Priya Sharma": "priya@medibot.in",
      "Dr. Ravi Kumar": "ravi@medibot.in",
      "Dr. Meena Iyer": "meena@medibot.in",
      "Dr. Suresh Babu": "suresh@medibot.in",
      "Dr. Anitha Raj": "anitha@medibot.in",
    };

    // Save to shared appointment store (visible to doctor portal)
    addAppointmentToStore({
      id: `apt-${Date.now()}`,
      patient_name: "Arjun Mehta",
      patient_email: "arjun@medibot.in",
      patient_age: 32,
      patient_gender: "Male",
      doctor_id: selectedDoctor.doctor_id,
      doctor_name: selectedDoctor.name,
      doctor_email: doctorEmails[selectedDoctor.name] || "priya@medibot.in",
      specialty: selectedDoctor.specialization || specialty,
      hospital: selectedDoctor.hospital || "",
      date: selectedDate,
      time_slot: selectedTime,
      reason: `${specialty} consultation`,
      severity: severity,
      status: "pending",
      episode_summary: `AI-recommended ${specialty} visit`,
      booked_at: new Date().toISOString(),
    });

    try {
      await bookAppointment({
        doctor_id: selectedDoctor.doctor_id,
        date: selectedDate,
        time_slot: selectedTime,
      });
    } catch {
      // API may fail in dev mode — appointment already saved to local store
    }

    setBooked(true);
    setBooking(false);
  }

  if (booked) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Appointment Booked!</h1>
        <p className="text-gray-600 mb-2">
          {selectedDoctor?.name} • {selectedDoctor?.specialization || specialty}
        </p>
        <p className="text-gray-600 mb-1">
          📅 {selectedDate} at {selectedTime}
        </p>
        <p className="text-gray-500 text-sm mb-6">
          🏥 {selectedDoctor?.hospital || selectedDoctor?.hospital_name}
        </p>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 mb-6 text-left">
          <h3 className="font-semibold text-blue-900 mb-2">Before your visit:</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• Bring any previous prescriptions</li>
            <li>• Note down when symptoms started</li>
            <li>• Carry your Aadhaar or insurance card</li>
            <li>• Arrive 10 minutes early</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <Link
            href="/dashboard"
            className="flex-1 rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 text-center"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/records/qr-share"
            className="flex-1 rounded-lg border border-gray-300 py-3 font-medium text-gray-700 hover:bg-gray-50 text-center"
          >
            Share QR with Doctor
          </Link>
        </div>
      </div>
    );
  }

  const severityLabel: Record<string, string> = {
    LOW: "Within 48 hours",
    MEDIUM: "Within 24 hours",
    HIGH: "Today",
    CRITICAL: "Immediately",
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/chat" className="text-sm text-blue-600 hover:underline">
        ← Back to Chat
      </Link>

      <h1 className="mt-4 mb-2 text-2xl font-bold text-gray-900">
        Book Appointment
      </h1>

      {/* Context Banner */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-3">
        <p className="text-sm text-blue-800">
          🩺 Looking for: <span className="font-semibold">{specialty}</span>
          {" • "}Urgency: <span className="font-semibold">{severityLabel[severity] || urgency + "h"}</span>
        </p>
      </div>

      {/* Doctor Selection */}
      <h2 className="font-semibold text-gray-900 mb-3">Select a Doctor</h2>
      {loading ? (
        <p className="text-gray-500 text-sm">Finding doctors near you...</p>
      ) : (
        <div className="space-y-3 mb-6">
          {doctors.map((doc) => (
            <div
              key={doc.doctor_id}
              onClick={() => setSelectedDoctor(doc)}
              className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                selectedDoctor?.doctor_id === doc.doctor_id
                  ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                  : "border-gray-200 bg-white hover:border-blue-300"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">{doc.name}</p>
                  <p className="text-sm text-gray-500">
                    {doc.specialization || doc.specialty || specialty}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    🏥 {doc.hospital || doc.hospital_name}
                  </p>
                  {doc.languages && (
                    <p className="text-xs text-gray-400">
                      🗣️ {doc.languages.join(", ")}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {doc.rating && (
                    <p className="text-sm font-medium text-yellow-600">⭐ {doc.rating}</p>
                  )}
                  {doc.consultation_fee && (
                    <p className="text-sm text-gray-600">₹{doc.consultation_fee}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Date Selection */}
      {selectedDoctor && (
        <>
          <h2 className="font-semibold text-gray-900 mb-3">Select Date</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
            {dates.map((d) => (
              <button
                key={d.value}
                onClick={() => setSelectedDate(d.value)}
                className={`flex-shrink-0 rounded-lg border px-4 py-2 text-sm ${
                  selectedDate === d.value
                    ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                    : "border-gray-200 text-gray-600 hover:border-blue-300"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Time Selection */}
      {selectedDate && (
        <>
          <h2 className="font-semibold text-gray-900 mb-3">Select Time</h2>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {timeSlots.map((slot) => (
              <button
                key={slot}
                onClick={() => setSelectedTime(slot)}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  selectedTime === slot
                    ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                    : "border-gray-200 text-gray-600 hover:border-blue-300"
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Error */}
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {/* Book Button */}
      {selectedDoctor && selectedDate && selectedTime && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mb-4">
          <p className="text-sm text-gray-700">
            <span className="font-medium">{selectedDoctor.name}</span>
            {" • "}{selectedDate} at {selectedTime}
            {" • "}🏥 {selectedDoctor.hospital || selectedDoctor.hospital_name}
          </p>
        </div>
      )}

      <button
        onClick={handleBook}
        disabled={!selectedDoctor || !selectedDate || !selectedTime || booking}
        className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-40"
      >
        {booking ? "Booking..." : "Confirm Appointment"}
      </button>
    </div>
  );
}
