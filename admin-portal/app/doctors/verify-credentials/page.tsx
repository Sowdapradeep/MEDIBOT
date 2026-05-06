"use client";

import { useState, useEffect } from "react";
import { getDoctors, verifyDoctor } from "@/lib/api";

interface Doctor {
  doctor_id: string;
  name: string;
  phone: string;
  specialty: string;
  qualifications: string[];
  verified: boolean;
  documents_url?: string;
}

export default function VerifyCredentialsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingDoctors();
  }, []);

  async function fetchPendingDoctors() {
    try {
      const data = await getDoctors();
      setDoctors(data.filter((d: Doctor) => !d.verified));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load doctors";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(doctorId: string) {
    setVerifying(doctorId);
    try {
      await verifyDoctor(doctorId);
      await fetchPendingDoctors();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Verification failed";
      setError(message);
    } finally {
      setVerifying(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading pending verifications...</p>
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
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Verify Doctor Credentials</h1>

      <div className="space-y-4">
        {doctors.map((doctor) => (
          <div key={doctor.doctor_id} className="rounded-xl bg-white p-6 shadow">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{doctor.name}</h3>
                <p className="text-sm text-gray-500">{doctor.phone}</p>
                <p className="mt-1 text-sm text-gray-600">Specialty: {doctor.specialty}</p>
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-500">Qualifications:</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {doctor.qualifications?.map((q, i) => (
                      <span key={i} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                        {q}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleVerify(doctor.doctor_id)}
                disabled={verifying === doctor.doctor_id}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {verifying === doctor.doctor_id ? "Verifying..." : "Verify"}
              </button>
            </div>
          </div>
        ))}
        {doctors.length === 0 && (
          <div className="rounded-xl bg-white p-8 text-center shadow">
            <p className="text-gray-500">No pending verifications</p>
          </div>
        )}
      </div>
    </div>
  );
}
