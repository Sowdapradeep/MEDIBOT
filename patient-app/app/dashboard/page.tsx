"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { getEpisodes, getAppointments } from "@/lib/api";
import Link from "next/link";

interface Episode {
  episode_id: string;
  status: string;
  severity: string;
  symptoms: string;
  body_system: string;
  created_at: string;
}

interface Appointment {
  appointment_id: string;
  doctor_name: string;
  specialty: string;
  hospital: string;
  date: string;
  time_slot: string;
  status: string;
}

// Mock data for demo/showcase
const MOCK_EPISODES: Episode[] = [
  {
    episode_id: "ep-001",
    status: "ACTIVE",
    severity: "MEDIUM",
    symptoms: "Fever and headache since 2 days",
    body_system: "general",
    created_at: "2026-05-05",
  },
  {
    episode_id: "ep-002",
    status: "IMPROVING",
    severity: "LOW",
    symptoms: "Mild cough and sore throat",
    body_system: "respiratory",
    created_at: "2026-05-03",
  },
  {
    episode_id: "ep-003",
    status: "CURED",
    severity: "LOW",
    symptoms: "Stomach pain after eating",
    body_system: "gastrointestinal",
    created_at: "2026-04-28",
  },
];

const MOCK_APPOINTMENTS: Appointment[] = [
  {
    appointment_id: "apt-001",
    doctor_name: "Dr. Priya Sharma",
    specialty: "General Physician",
    hospital: "Apollo Clinic, Anna Nagar",
    date: "2026-05-07",
    time_slot: "10:30 AM",
    status: "CONFIRMED",
  },
  {
    appointment_id: "apt-002",
    doctor_name: "Dr. Ravi Kumar",
    specialty: "Pulmonologist",
    hospital: "Kauvery Hospital",
    date: "2026-05-10",
    time_slot: "03:00 PM",
    status: "CONFIRMED",
  },
];

const MOCK_MEDICINES = [
  { name: "Paracetamol 500mg", time: "08:00 AM", taken: true },
  { name: "Cetirizine 10mg", time: "09:00 PM", taken: false },
  { name: "Vitamin C", time: "08:00 AM", taken: true },
];

export default function DashboardPage() {
  const [episodes, setEpisodes] = useState<Episode[]>(MOCK_EPISODES);
  const [appointments, setAppointments] = useState<Appointment[]>(MOCK_APPOINTMENTS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [episodesData, appointmentsData] = await Promise.all([
          getEpisodes().catch(() => ({ episodes: [] })),
          getAppointments("upcoming").catch(() => ({ appointments: [] })),
        ]);
        // Use API data if available, otherwise keep mock
        if (episodesData.episodes?.length > 0) setEpisodes(episodesData.episodes);
        if (appointmentsData.appointments?.length > 0) setAppointments(appointmentsData.appointments);
      } catch {
        // Keep mock data
      }
    }
    loadData();
  }, []);

  const severityColors: Record<string, string> = {
    LOW: "bg-green-100 text-green-700",
    MEDIUM: "bg-yellow-100 text-yellow-700",
    HIGH: "bg-orange-100 text-orange-700",
    CRITICAL: "bg-red-100 text-red-700",
  };

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-blue-100 text-blue-700",
    IMPROVING: "bg-green-100 text-green-700",
    CURED: "bg-gray-100 text-gray-600",
    ESCALATED: "bg-red-100 text-red-700",
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hi, Arjun 👋</h1>
          <p className="text-sm text-gray-500">How are you feeling today?</p>
        </div>
        <Link href="/profile" className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
          A
        </Link>
      </div>

      {/* Main CTA - Symptom Analysis */}
      <Link
        href="/chat"
        className="mb-6 block rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all"
      >
        <div className="flex items-center gap-4">
          <span className="text-4xl">🩺</span>
          <div>
            <p className="text-lg font-semibold">Symptom Analysis</p>
            <p className="text-sm text-blue-100">Text, Voice, or Photo — Get instant AI guidance</p>
          </div>
          <span className="ml-auto text-2xl">→</span>
        </div>
      </Link>

      {/* Quick Actions Row */}
      <div className="mb-6 grid grid-cols-4 gap-3">
        <Link href="/follow-up/checkin" className="rounded-lg bg-orange-50 p-3 text-center hover:bg-orange-100">
          <span className="text-xl">📋</span>
          <p className="mt-1 text-xs font-medium text-orange-700">Check-in</p>
        </Link>
        <Link href="/records/prescriptions" className="rounded-lg bg-green-50 p-3 text-center hover:bg-green-100 col-span-2">
          <span className="text-3xl">💊</span>
          <p className="mt-1 text-sm font-semibold text-green-700">Prescription & Monitoring</p>
          <p className="text-xs text-green-500">Upload Rx, track recovery</p>
        </Link>
        <Link href="/records/qr-share" className="rounded-lg bg-purple-50 p-3 text-center hover:bg-purple-100">
          <span className="text-xl">🔗</span>
          <p className="mt-1 text-xs font-medium text-purple-700">QR Share</p>
        </Link>
        <Link href="/records/timeline" className="rounded-lg bg-indigo-50 p-3 text-center hover:bg-indigo-100">
          <span className="text-xl">📊</span>
          <p className="mt-1 text-xs font-medium text-indigo-700">Records</p>
        </Link>
      </div>

      {/* Today's Medicines */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800">Today's Prescription</h2>
          <span className="text-xs text-gray-500">{MOCK_MEDICINES.filter(m => m.taken).length}/{MOCK_MEDICINES.length} taken</span>
        </div>
        <div className="space-y-2">
          {MOCK_MEDICINES.map((med, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
              <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${med.taken ? "border-green-500 bg-green-500" : "border-gray-300"}`}>
                {med.taken && <span className="text-white text-xs">✓</span>}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{med.name}</p>
                <p className="text-xs text-gray-400">{med.time}</p>
              </div>
              {!med.taken && (
                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">Pending</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming Appointments */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800">Upcoming Appointments</h2>
          <Link href="/appointments/upcoming" className="text-xs text-blue-600">View all →</Link>
        </div>
        <div className="space-y-3">
          {appointments.map((apt) => (
            <div key={apt.appointment_id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{apt.doctor_name}</p>
                  <p className="text-sm text-gray-500">{apt.specialty}</p>
                  <p className="text-xs text-gray-400 mt-1">🏥 {apt.hospital}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-blue-700">{apt.date}</p>
                  <p className="text-xs text-gray-500">{apt.time_slot}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Active Episodes */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800">Health Episodes</h2>
          <Link href="/records/timeline" className="text-xs text-blue-600">View all →</Link>
        </div>
        <div className="space-y-3">
          {episodes.map((ep) => (
            <div key={ep.episode_id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-gray-800">{ep.symptoms}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[ep.status] || ""}`}>
                  {ep.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded px-1.5 py-0.5 text-xs ${severityColors[ep.severity] || ""}`}>
                  {ep.severity}
                </span>
                <span className="text-xs text-gray-400 capitalize">• {ep.body_system}</span>
                <span className="text-xs text-gray-400">• {ep.created_at}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-white px-4 py-2">
        <div className="mx-auto max-w-4xl flex justify-around">
          <Link href="/dashboard" className="flex flex-col items-center text-blue-600">
            <span className="text-lg">🏠</span>
            <span className="text-xs font-medium">Home</span>
          </Link>
          <Link href="/chat" className="flex flex-col items-center text-gray-400">
            <span className="text-lg">🩺</span>
            <span className="text-xs">Analyze</span>
          </Link>
          <Link href="/appointments/upcoming" className="flex flex-col items-center text-gray-400">
            <span className="text-lg">📅</span>
            <span className="text-xs">Appointments</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center text-gray-400">
            <span className="text-lg">👤</span>
            <span className="text-xs">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
