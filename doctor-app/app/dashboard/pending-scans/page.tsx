"use client";

import { useState, useEffect } from "react";
import { getAppointments } from "@/lib/api";
import Link from "next/link";

interface PendingPatient {
  id: string;
  patient_name: string;
  time_slot: string;
  check_in_time?: string;
}

export default function PendingScansPage() {
  const [patients, setPatients] = useState<PendingPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPending() {
      try {
        const data = await getAppointments("checked_in");
        setPatients(data.appointments || []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load pending scans";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    fetchPending();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-green-700">Loading pending scans...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Pending QR Scans</h1>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {patients.length === 0 ? (
        <p className="text-gray-500">No patients waiting for QR scan.</p>
      ) : (
        <div className="space-y-4">
          {patients.map((patient) => (
            <div
              key={patient.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div>
                <p className="font-medium text-gray-900">{patient.patient_name}</p>
                <p className="text-sm text-gray-500">
                  Slot: {patient.time_slot}
                </p>
                {patient.check_in_time && (
                  <p className="text-xs text-gray-400">
                    Checked in: {patient.check_in_time}
                  </p>
                )}
              </div>
              <Link
                href="/patient/qr-scanner"
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
              >
                Scan QR
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
