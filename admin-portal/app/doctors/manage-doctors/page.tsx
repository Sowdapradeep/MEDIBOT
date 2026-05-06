"use client";

import { useState, useEffect } from "react";
import { getDoctors, verifyDoctor, deactivateDoctor } from "@/lib/api";

interface Doctor {
  doctor_id: string;
  name: string;
  phone: string;
  specialty: string;
  status: string;
  verified: boolean;
}

export default function ManageDoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  async function fetchDoctors() {
    try {
      const data = await getDoctors();
      setDoctors(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load doctors";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(doctorId: string) {
    setActionLoading(doctorId);
    try {
      await verifyDoctor(doctorId);
      await fetchDoctors();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to verify doctor";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeactivate(doctorId: string) {
    setActionLoading(doctorId);
    try {
      await deactivateDoctor(doctorId);
      await fetchDoctors();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to deactivate doctor";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading doctors...</p>
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
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Manage Doctors</h1>

      <div className="overflow-hidden rounded-xl bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Specialty</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {doctors.map((doctor) => (
              <tr key={doctor.doctor_id}>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{doctor.name}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{doctor.phone}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{doctor.specialty}</td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                    doctor.status === "active" ? "bg-green-100 text-green-800" :
                    doctor.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                    "bg-red-100 text-red-800"
                  }`}>
                    {doctor.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <div className="flex gap-2">
                    {!doctor.verified && (
                      <button
                        onClick={() => handleVerify(doctor.doctor_id)}
                        disabled={actionLoading === doctor.doctor_id}
                        className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Verify
                      </button>
                    )}
                    {doctor.status === "active" && (
                      <button
                        onClick={() => handleDeactivate(doctor.doctor_id)}
                        disabled={actionLoading === doctor.doctor_id}
                        className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                </td>
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
