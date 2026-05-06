"use client";

import { useState, useEffect } from "react";
import { getAppointments } from "@/lib/api";

interface Appointment {
  id: string;
  patient_name: string;
  date: string;
  time_slot: string;
  status: string;
  diagnosis?: string;
}

export default function AppointmentHistoryPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchHistory() {
      try {
        const data = await getAppointments("completed");
        setAppointments(data.appointments || []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load history";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-green-700">Loading history...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Appointment History</h1>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {appointments.length === 0 ? (
        <p className="text-gray-500">No past appointments.</p>
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
                  {apt.diagnosis && (
                    <p className="mt-1 text-sm text-gray-500">
                      Diagnosis: {apt.diagnosis}
                    </p>
                  )}
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
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
