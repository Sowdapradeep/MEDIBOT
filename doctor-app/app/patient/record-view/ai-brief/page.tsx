"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getPatientRecord } from "@/lib/api";

interface AIBrief {
  summary: string;
  risk_factors: string[];
  recommendations: string[];
  drug_interactions?: string[];
  follow_up_needed: boolean;
}

export default function AIBriefPage() {
  const searchParams = useSearchParams();
  const episodeId = searchParams.get("episode_id") || "";
  const [brief, setBrief] = useState<AIBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchBrief() {
      if (!episodeId) {
        setError("No episode ID provided");
        setLoading(false);
        return;
      }
      try {
        const data = await getPatientRecord(episodeId);
        setBrief(data.ai_brief || null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load AI brief";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    fetchBrief();
  }, [episodeId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-green-700">Generating AI brief...</div>
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
      <h1 className="mb-6 text-2xl font-bold text-gray-900">AI Clinical Brief</h1>

      {brief ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-medium text-gray-500">Summary</h2>
            <p className="mt-1 text-gray-900">{brief.summary}</p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-medium text-gray-500">Risk Factors</h2>
            <ul className="mt-2 space-y-1">
              {brief.risk_factors.map((risk, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-red-400" />
                  {risk}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-medium text-gray-500">Recommendations</h2>
            <ul className="mt-2 space-y-1">
              {brief.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-green-400" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>

          {brief.drug_interactions && brief.drug_interactions.length > 0 && (
            <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4">
              <h2 className="text-sm font-medium text-yellow-800">Drug Interactions</h2>
              <ul className="mt-2 space-y-1">
                {brief.drug_interactions.map((interaction, i) => (
                  <li key={i} className="text-sm text-yellow-700">
                    ⚠️ {interaction}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-medium text-gray-500">Follow-up Required</h2>
            <p className="mt-1 text-gray-900">
              {brief.follow_up_needed ? "Yes — schedule follow-up" : "No immediate follow-up needed"}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-gray-500">No AI brief available for this episode.</p>
      )}
    </div>
  );
}
