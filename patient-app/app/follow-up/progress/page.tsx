"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { getEpisodes } from "@/lib/api";

interface FollowupEntry {
  date: string;
  pain_score: number;
  medicine_taken: boolean;
  new_symptoms?: string;
}

interface Episode {
  episode_id: string;
  symptoms: string;
  followups?: FollowupEntry[];
}

export default function ProgressPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getEpisodes();
        const eps = data.episodes || [];
        setEpisodes(eps);
        if (eps.length > 0) setSelectedEpisode(eps[0]);
      } catch (err) {
        console.error("Failed to load progress:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading progress...</p>
      </div>
    );
  }

  const followups = selectedEpisode?.followups || [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Recovery Progress</h1>

      {episodes.length > 1 && (
        <div className="mb-4">
          <select
            value={selectedEpisode?.episode_id || ""}
            onChange={(e) => {
              const ep = episodes.find((ep) => ep.episode_id === e.target.value);
              setSelectedEpisode(ep || null);
            }}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            aria-label="Select episode"
          >
            {episodes.map((ep) => (
              <option key={ep.episode_id} value={ep.episode_id}>
                {ep.symptoms}
              </option>
            ))}
          </select>
        </div>
      )}

      {followups.length === 0 ? (
        <div className="text-center">
          <p className="text-gray-500">No check-in data yet</p>
          <a
            href="/follow-up/checkin"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            Complete your first check-in
          </a>
        </div>
      ) : (
        <>
          {/* Pain Score Trend */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 font-semibold text-gray-800">Pain Score Trend</h2>
            <div className="flex items-end gap-1" style={{ height: "120px" }}>
              {followups.map((entry, idx) => (
                <div key={idx} className="flex flex-1 flex-col items-center">
                  <div
                    className="w-full rounded-t bg-blue-400"
                    style={{ height: `${(entry.pain_score / 10) * 100}%` }}
                    title={`Pain: ${entry.pain_score}/10`}
                  />
                  <span className="mt-1 text-xs text-gray-400">
                    {entry.date.slice(-5)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Medicine Adherence */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 font-semibold text-gray-800">Medicine Adherence</h2>
            <div className="flex gap-2">
              {followups.map((entry, idx) => (
                <div
                  key={idx}
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${
                    entry.medicine_taken
                      ? "bg-green-100 text-green-600"
                      : "bg-red-100 text-red-600"
                  }`}
                  title={`${entry.date}: ${entry.medicine_taken ? "Taken" : "Missed"}`}
                >
                  {entry.medicine_taken ? "✓" : "✗"}
                </div>
              ))}
            </div>
          </div>

          {/* Recent Entries */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 font-semibold text-gray-800">Recent Check-ins</h2>
            <div className="space-y-3">
              {followups.slice(-5).reverse().map((entry, idx) => (
                <div key={idx} className="border-b border-gray-100 pb-2 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{entry.date}</span>
                    <span className="text-sm font-medium text-blue-600">
                      Pain: {entry.pain_score}/10
                    </span>
                  </div>
                  {entry.new_symptoms && (
                    <p className="mt-1 text-xs text-gray-500">{entry.new_symptoms}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

