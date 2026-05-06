"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getPatientRecord } from "@/lib/api";

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  prescribed_date: string;
}

export default function CurrentMedicinesPage() {
  const searchParams = useSearchParams();
  const episodeId = searchParams.get("episode_id") || "";
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchMedicines() {
      if (!episodeId) {
        setError("No episode ID provided");
        setLoading(false);
        return;
      }
      try {
        const data = await getPatientRecord(episodeId);
        setMedicines(data.current_medicines || []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load medicines";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    fetchMedicines();
  }, [episodeId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-green-700">Loading medicines...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Current Medicines</h1>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {medicines.length === 0 ? (
        <p className="text-gray-500">No current medicines on record.</p>
      ) : (
        <div className="space-y-4">
          {medicines.map((med, i) => (
            <div
              key={i}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <p className="font-medium text-gray-900">{med.name}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600">
                <p>Dosage: {med.dosage}</p>
                <p>Frequency: {med.frequency}</p>
                <p>Duration: {med.duration}</p>
                <p>Prescribed: {med.prescribed_date}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
