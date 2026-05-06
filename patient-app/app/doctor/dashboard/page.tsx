"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAppointmentsForDoctor, updateAppointmentStatus, SharedAppointment } from "@/lib/appointments-store";

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState<SharedAppointment[]>([]);

  useEffect(() => {
    // Load appointments for Dr. Priya from shared store
    const loadAppointments = () => {
      const appts = getAppointmentsForDoctor("priya@medibot.in");
      setAppointments(appts);
    };
    loadAppointments();

    // Poll for new appointments every 3 seconds
    const interval = setInterval(loadAppointments, 3000);
    return () => clearInterval(interval);
  }, []);

  function acceptAppointment(id: string) {
    updateAppointmentStatus(id, "accepted");
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "accepted" as const } : a)));
  }

  function cancelAppointment(id: string) {
    updateAppointmentStatus(id, "cancelled");
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "cancelled" as const } : a)));
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
    <div className="mx-auto max-w-3xl px-4 py-6 pb-20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dr. Priya Sharma 👩‍⚕️</h1>
          <p className="text-sm text-gray-500">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <Link href="/doctor/qr-scanner" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
          📷 Scan QR
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{appointments.length}</p>
          <p className="text-xs text-blue-600">Total</p>
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

      {/* Pending */}
      {pending.length > 0 && (
        <section className="mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-3">⏳ Pending ({pending.length})</h2>
          <div className="space-y-3">
            {pending.map((apt) => (
              <div key={apt.id} className="rounded-lg border border-yellow-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{apt.patient_name}</p>
                    <p className="text-sm text-gray-500">{apt.patient_age}y {apt.patient_gender} • {apt.time_slot}</p>
                    <p className="text-sm text-gray-600 mt-1">{apt.reason}</p>
                    <p className="text-xs text-gray-400 mt-0.5">📅 {apt.date} • 🏥 {apt.hospital}</p>
                    {apt.episode_summary && <p className="text-xs text-blue-600 mt-1 italic">{apt.episode_summary}</p>}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityColors[apt.severity]}`}>{apt.severity}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => acceptAppointment(apt.id)} className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700">✓ Accept</button>
                  <button onClick={() => cancelAppointment(apt.id)} className="flex-1 rounded-lg border border-red-300 py-2 text-sm font-medium text-red-600 hover:bg-red-50">✗ Decline</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Accepted */}
      {accepted.length > 0 && (
        <section className="mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-3">✅ Accepted ({accepted.length})</h2>
          <div className="space-y-3">
            {accepted.map((apt) => (
              <div key={apt.id} className="rounded-lg border border-green-200 bg-white p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{apt.patient_name}</p>
                  <p className="text-sm text-gray-500">{apt.patient_age}y {apt.patient_gender} • {apt.date} {apt.time_slot}</p>
                  <p className="text-sm text-gray-600">{apt.reason}</p>
                </div>
                <Link href="/doctor/qr-scanner" className="rounded-lg bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">Scan QR</Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-white px-4 py-2">
        <div className="mx-auto max-w-3xl flex justify-around">
          <Link href="/doctor/dashboard" className="flex flex-col items-center text-green-600">
            <span className="text-lg">📅</span><span className="text-xs font-medium">Appointments</span>
          </Link>
          <Link href="/doctor/qr-scanner" className="flex flex-col items-center text-gray-400">
            <span className="text-lg">📷</span><span className="text-xs">Scan QR</span>
          </Link>
          <Link href="/" className="flex flex-col items-center text-gray-400">
            <span className="text-lg">🚪</span><span className="text-xs">Logout</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

