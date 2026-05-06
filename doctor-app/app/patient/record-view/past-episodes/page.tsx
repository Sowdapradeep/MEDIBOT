"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getPatientRecord } from "@/lib/api";

interface PastEpisode {
  episode_id: string;
  chief_complaint: string;
  diagnosis?: string;
  date: string;
  status: string;
}

export default function PastEpisodesPage() {
  const searchParams = useSearchParams();
  const episodeId = searchParams.get("episode_id") || "";
  const [episodes, setEpisodes] = useState<PastEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPastEpisodes() {
      if (!episodeId) {
        setError("No episode ID provided");
        setLoading(false);
        return;
      }
      try {
        const data = await getPatientRecord(episodeId);
        setEpisodes(data.past_episodes || []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load past episodes";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    fetchPastEpisodes();
  }, [episodeId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-green-700">Loading past episodes...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Past Episodes</h1>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {episodes.length === 0 ? (
        <p className="text-gray-500">No past episodes found for this patient.</p>
      ) : (
        <div className="space-y-4">
          {episodes.map((ep) => (
            <div
              key={ep.episode_id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{ep.chief_complaint}</p>
                  {ep.diagnosis && (
                    <p className="mt-1 text-sm text-gray-600">
                      Diagnosis: {ep.diagnosis}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400">{ep.date}</span>
              </div>
              <p className="mt-2 text-xs capitalize text-gray-500">{ep.status}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
