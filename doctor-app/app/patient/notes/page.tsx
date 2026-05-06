"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { addNotes } from "@/lib/api";

export default function PatientNotesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const episodeId = searchParams.get("episode_id") || "";

  const [diagnosis, setDiagnosis] = useState("");
  const [observations, setObservations] = useState("");
  const [plan, setPlan] = useState("");
  const [followUpDays, setFollowUpDays] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!episodeId) {
      setError("No episode ID provided");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await addNotes(episodeId, {
        diagnosis,
        observations,
        treatment_plan: plan,
        follow_up_days: followUpDays ? parseInt(followUpDays) : null,
      });
      setSuccess(true);
      setTimeout(() => {
        router.push(`/patient/record-view/episode-summary?episode_id=${episodeId}`);
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save notes";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Clinical Notes</h1>

      {success && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          Notes saved successfully. Redirecting...
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="diagnosis" className="block text-sm font-medium text-gray-700">
            Diagnosis
          </label>
          <input
            id="diagnosis"
            type="text"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="Primary diagnosis"
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            required
          />
        </div>

        <div>
          <label htmlFor="observations" className="block text-sm font-medium text-gray-700">
            Observations
          </label>
          <textarea
            id="observations"
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Clinical observations, vitals, examination findings..."
            rows={4}
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            required
          />
        </div>

        <div>
          <label htmlFor="plan" className="block text-sm font-medium text-gray-700">
            Treatment Plan
          </label>
          <textarea
            id="plan"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            placeholder="Treatment plan, instructions, referrals..."
            rows={3}
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            required
          />
        </div>

        <div>
          <label htmlFor="followup" className="block text-sm font-medium text-gray-700">
            Follow-up (days)
          </label>
          <input
            id="followup"
            type="number"
            value={followUpDays}
            onChange={(e) => setFollowUpDays(e.target.value)}
            placeholder="e.g. 7"
            min="1"
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-green-700 py-2 font-medium text-white hover:bg-green-800 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Notes"}
        </button>
      </form>
    </div>
  );
}
