"use client";

import { useState, useEffect } from "react";
import { getDoctors } from "@/lib/api";

interface Doctor {
  doctor_id: string;
  name: string;
  specialty: string;
  status: string;
  appointments_today: number;
  last_active: string;
}

export default function DoctorActivityPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchDoctors() {
      try {
        const data = await getDoctors();
        setDoctors(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load doctor activity";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    fetchDoctors();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading doctor activity...</p>
      </div>
    );
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
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Doctor Activity</h1>

      <div className="overflow-hidden rounded-xl bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Specialty</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Appointments Today</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Last Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {doctors.map((doctor) => (
              <tr key={doctor.doctor_id}>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{doctor.name}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{doctor.specialty}</td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                    doctor.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                  }`}>
                    {doctor.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{doctor.appointments_today}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{doctor.last_active}</td>
              </tr>
            ))}
            {doctors.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">No doctors found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
