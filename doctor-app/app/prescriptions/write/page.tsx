"use client";

import { useState } from "react";
import { createPrescription } from "@/lib/api";

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

const EMPTY_MEDICINE: Medicine = {
  name: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
};

export default function WritePrescriptionPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([{ ...EMPTY_MEDICINE }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function addMedicine() {
    setMedicines([...medicines, { ...EMPTY_MEDICINE }]);
  }

  function removeMedicine(index: number) {
    if (medicines.length === 1) return;
    setMedicines(medicines.filter((_, i) => i !== index));
  }

  function updateMedicine(index: number, field: keyof Medicine, value: string) {
    const updated = [...medicines];
    updated[index] = { ...updated[index], [field]: value };
    setMedicines(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      await createPrescription(medicines);
      setSuccess(true);
      setMedicines([{ ...EMPTY_MEDICINE }]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create prescription";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Write Prescription</h1>

      {success && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          Prescription created successfully.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {medicines.map((med, index) => (
          <div
            key={index}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">
                Medicine {index + 1}
              </h3>
              {medicines.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeMedicine(index)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={med.name}
                onChange={(e) => updateMedicine(index, "name", e.target.value)}
                placeholder="Medicine name"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={med.dosage}
                  onChange={(e) => updateMedicine(index, "dosage", e.target.value)}
                  placeholder="Dosage (e.g. 500mg)"
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  required
                />
                <input
                  type="text"
                  value={med.frequency}
                  onChange={(e) => updateMedicine(index, "frequency", e.target.value)}
                  placeholder="Frequency (e.g. 3x daily)"
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  required
                />
              </div>

              <input
                type="text"
                value={med.duration}
                onChange={(e) => updateMedicine(index, "duration", e.target.value)}
                placeholder="Duration (e.g. 5 days)"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                required
              />

              <textarea
                value={med.instructions}
                onChange={(e) => updateMedicine(index, "instructions", e.target.value)}
                placeholder="Special instructions (e.g. Take after food)"
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addMedicine}
          className="w-full rounded-lg border-2 border-dashed border-gray-300 py-2 text-sm font-medium text-gray-500 hover:border-green-500 hover:text-green-700"
        >
          + Add Medicine
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-green-700 py-2 font-medium text-white hover:bg-green-800 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Prescription"}
        </button>
      </form>
    </div>
  );
}
