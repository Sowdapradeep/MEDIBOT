"use client";

import { useState, useEffect } from "react";
import { getAppointments } from "@/lib/api";

interface Appointment {
  id: string;
  patient_name: string;
  date: string;
  time_slot: string;
  status: string;
  reason?: string;
}

export default function SchedulePage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchSchedule() {
      try {
        const data = await getAppointments("upcoming");
        setAppointments(data.appointments || []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load schedule";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    fetchSchedule();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-green-700">Loading schedule...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Appointment Schedule</h1>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {appointments.length === 0 ? (
        <p className="text-gray-500">No upcoming appointments.</p>
      ) : (
        <div className="space-y-4">
          {appointments.map((apt) => (
            <div
              key={apt.id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{apt.patient_name}</p>
                  <p className="text-sm text-gray-600">
                    {apt.date} • {apt.time_slot}
                  </p>
                  {apt.reason && (
                    <p className="mt-1 text-sm text-gray-500">{apt.reason}</p>
                  )}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    apt.status === "confirmed"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {apt.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
