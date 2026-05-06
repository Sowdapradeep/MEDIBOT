"use client";

import { useState, useEffect } from "react";
import { getHospitalAppointments } from "@/lib/api";

interface Appointment {
  appointment_id: string;
  patient_name: string;
  doctor_name: string;
  date: string;
  time_slot: string;
  status: string;
  specialty: string;
}

export default function AppointmentsOverviewPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter]);

  async function fetchAppointments() {
    setLoading(true);
    try {
      const data = await getHospitalAppointments(statusFilter || undefined);
      setAppointments(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load appointments";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-600" role="alert">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Appointments Overview</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          aria-label="Filter by status"
        >
          <option value="">All Status</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No Show</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Loading appointments...</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Doctor</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Specialty</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {appointments.map((appt) => (
                <tr key={appt.appointment_id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{appt.patient_name}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{appt.doctor_name}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{appt.specialty}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{appt.date}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{appt.time_slot}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      appt.status === "scheduled" ? "bg-blue-100 text-blue-800" :
                      appt.status === "completed" ? "bg-green-100 text-green-800" :
                      appt.status === "cancelled" ? "bg-red-100 text-red-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {appt.status}
                    </span>
                  </td>
                </tr>
              ))}
              {appointments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">No appointments found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
