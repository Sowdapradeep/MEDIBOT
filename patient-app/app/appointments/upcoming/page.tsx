"use client";

import { useEffect, useState } from "react";
import { getAppointments } from "@/lib/api";

interface Appointment {
  appointment_id: string;
  doctor_name: string;
  specialty: string;
  hospital: string;
  date: string;
  time_slot: string;
  status: string;
}

export default function UpcomingAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getAppointments("upcoming");
        setAppointments(data.appointments || []);
      } catch (err) {
        console.error("Failed to load appointments:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading appointments...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Upcoming Appointments</h1>

      {appointments.length === 0 ? (
        <div className="text-center">
          <p className="text-gray-500">No upcoming appointments</p>
          <a
            href="/appointments/book"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            Book an Appointment
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((apt) => (
            <div
              key={apt.appointment_id}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-800">{apt.doctor_name}</p>
                  <p className="text-sm text-gray-500">{apt.specialty}</p>
                  <p className="text-xs text-gray-400">{apt.hospital}</p>
                </div>
                <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                  {apt.status}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                <span>📅 {apt.date}</span>
                <span>🕐 {apt.time_slot}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
