"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getPatientRecord } from "@/lib/api";
import Link from "next/link";

interface EpisodeSummary {
  episode_id: string;
  patient_name: string;
  chief_complaint: string;
  triage_level: string;
  symptoms: string[];
  ai_summary: string;
  created_at: string;
  status: string;
}

export default function EpisodeSummaryPage() {
  const searchParams = useSearchParams();
  const episodeId = searchParams.get("episode_id") || "";
  const [episode, setEpisode] = useState<EpisodeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchRecord() {
      if (!episodeId) {
        setError("No episode ID provided");
        setLoading(false);
        return;
      }
      try {
        const data = await getPatientRecord(episodeId);
        setEpisode(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load record";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    fetchRecord();
  }, [episodeId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-green-700">Loading episode...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Episode Summary</h1>
      {episode && (
        <>
          <p className="mb-6 text-sm text-gray-500">Patient: {episode.patient_name}</p>

          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-medium text-gray-500">Chief Complaint</h2>
              <p className="mt-1 text-gray-900">{episode.chief_complaint}</p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-medium text-gray-500">Triage Level</h2>
              <span
                className={`mt-1 inline-block rounded-full px-3 py-1 text-sm font-medium ${
                  episode.triage_level === "emergency"
                    ? "bg-red-100 text-red-700"
                    : episode.triage_level === "urgent"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {episode.triage_level}
              </span>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-medium text-gray-500">Symptoms</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {episode.symptoms.map((symptom, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                  >
                    {symptom}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-medium text-gray-500">AI Summary</h2>
              <p className="mt-1 text-gray-900">{episode.ai_summary}</p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-medium text-gray-500">Status</h2>
              <p className="mt-1 capitalize text-gray-900">{episode.status}</p>
              <p className="text-xs text-gray-400">{episode.created_at}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Link
              href={`/patient/record-view/past-episodes?episode_id=${episodeId}`}
              className="rounded-lg border border-gray-300 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Past Episodes
            </Link>
            <Link
              href={`/patient/record-view/current-medicines?episode_id=${episodeId}`}
              className="rounded-lg border border-gray-300 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Medicines
            </Link>
            <Link
              href={`/patient/record-view/ai-brief?episode_id=${episodeId}`}
              className="rounded-lg border border-gray-300 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              AI Brief
            </Link>
            <Link
              href={`/patient/notes?episode_id=${episodeId}`}
              className="rounded-lg bg-green-700 py-2 text-center text-sm font-medium text-white hover:bg-green-800"
            >
              Add Notes
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
