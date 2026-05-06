"use client";

import { useState } from "react";
import Link from "next/link";

interface Appointment {
  id: string;
  patient_name: string;
  age: number;
  gender: string;
  time: string;
  reason: string;
  severity: string;
  status: "pending" | "accepted" | "completed" | "cancelled";
  episode_summary?: string;
}

const MOCK_APPOINTMENTS: Appointment[] = [
  { id: "apt-001", patient_name: "Arjun Mehta", age: 32, gender: "Male", time: "10:30 AM", reason: "Fever & headache (3 days)", severity: "MEDIUM", status: "pending", episode_summary: "Upper respiratory infection suspected" },
  { id: "apt-002", patient_name: "Priya Lakshmi", age: 45, gender: "Female", time: "11:00 AM", reason: "Chest discomfort", severity: "HIGH", status: "pending", episode_summary: "Needs cardiac evaluation" },
  { id: "apt-003", patient_name: "Ravi Shankar", age: 28, gender: "Male", time: "11:30 AM", reason: "Skin rash on arms", severity: "LOW", status: "accepted", episode_summary: "Possible contact dermatitis" },
  { id: "apt-004", patient_name: "Meena Kumari", age: 55, gender: "Female", time: "12:00 PM", reason: "Follow-up: Gastritis", severity: "LOW", status: "accepted" },
  { id: "apt-005", patient_name: "Karthik S.", age: 38, gender: "Male", time: "02:30 PM", reason: "Lower back pain (1 week)", severity: "MEDIUM", status: "pending" },
  { id: "apt-006", patient_name: "Ananya Devi", age: 22, gender: "Female", time: "03:00 PM", reason: "Migraine episodes", severity: "MEDIUM", status: "pending" },
];

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState(MOCK_APPOINTMENTS);

  function acceptAppointment(id: string) {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "accepted" as const } : a))
    );
  }

  function cancelAppointment(id: string) {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "cancelled" as const } : a))
    );
  }

  const pending = appointments.filter((a) => a.status === "pending");
  const accepted = appointments.filter((a) => a.status === "accepted");
  const severityColors: Record<string, string> = {
    LOW: "bg-green-100 text-green-700",
    MEDIUM: "bg-yellow-100 text-yellow-700",
    HIGH: "bg-orange-100 text-orange-700",
    CRITICAL: "bg-red-100 text-red-700",
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Good Morning, Dr. Priya 👩‍⚕️</h1>
          <p className="text-sm text-gray-500">Today: {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <Link href="/patient/qr-scanner" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 shadow-sm">
          📷 Scan QR
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{appointments.length}</p>
          <p className="text-xs text-blue-600">Total Today</p>
        </div>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-center">
          <p className="text-2xl font-bold text-yellow-700">{pending.length}</p>
          <p className="text-xs text-yellow-600">Pending</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{accepted.length}</p>
          <p className="text-xs text-green-600">Accepted</p>
        </div>
      </div>

      {/* Pending Appointments */}
      {pending.length > 0 && (
        <section className="mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-3">⏳ Pending Approval ({pending.length})</h2>
          <div className="space-y-3">
            {pending.map((apt) => (
              <div key={apt.id} className="rounded-lg border border-yellow-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{apt.patient_name}</p>
                    <p className="text-sm text-gray-500">{apt.age}y {apt.gender} • {apt.time}</p>
                    <p className="text-sm text-gray-600 mt-1">{apt.reason}</p>
                    {apt.episode_summary && <p className="text-xs text-blue-600 mt-1 italic">{apt.episode_summary}</p>}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityColors[apt.severity]}`}>
                    {apt.severity}
                  </span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => acceptAppointment(apt.id)}
                    className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    ✓ Accept
                  </button>
                  <button
                    onClick={() => cancelAppointment(apt.id)}
                    className="flex-1 rounded-lg border border-red-300 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    ✗ Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Accepted Appointments */}
      {accepted.length > 0 && (
        <section className="mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-3">✅ Today's Schedule ({accepted.length})</h2>
          <div className="space-y-3">
            {accepted.map((apt) => (
              <div key={apt.id} className="rounded-lg border border-green-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{apt.patient_name}</p>
                    <p className="text-sm text-gray-500">{apt.age}y {apt.gender} • {apt.time}</p>
                    <p className="text-sm text-gray-600 mt-1">{apt.reason}</p>
                  </div>
                  <Link
                    href="/patient/qr-scanner"
                    className="rounded-lg bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
                  >
                    Scan QR
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-white px-4 py-2">
        <div className="mx-auto max-w-3xl flex justify-around">
          <Link href="/dashboard/today-appointments" className="flex flex-col items-center text-green-600">
            <span className="text-lg">📅</span>
            <span className="text-xs font-medium">Appointments</span>
          </Link>
          <Link href="/patient/qr-scanner" className="flex flex-col items-center text-gray-400">
            <span className="text-lg">📷</span>
            <span className="text-xs">Scan QR</span>
          </Link>
          <Link href="/prescriptions/write" className="flex flex-col items-center text-gray-400">
            <span className="text-lg">📝</span>
            <span className="text-xs">Prescribe</span>
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
