"use client";

import { useState } from "react";
import { submitSymptoms } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface PipelineResult {
  status: string;
  data: {
    episode_id: string;
    triage: {
      body_system: string;
      possible_condition_category: string;
      key_symptoms_identified: string[];
      clarifying_questions: string[];
      confidence: number;
      immediate_flag: boolean;
      notes: string;
    };
    decision: {
      severity: string;
      urgency_hours: number | null;
      reasoning: string;
      escalate_to_emergency: boolean;
      recommended_specialist_type: string;
    };
    suggestion: {
      severity_acknowledged: string;
      immediate_actions: string[];
      home_care_instructions: string[];
      what_to_avoid: string[];
      warning_signs: string[];
      otc_suggestions: string[];
      reassurance_message: string;
      follow_up_in_hours: number | null;
    };
    doctor_recommendation: {
      primary_specialty: string;
      secondary_specialty: string | null;
      telemedicine_suitable: boolean;
    };
  };
}

export default function TextInputPage() {
  const router = useRouter();
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!symptoms.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await submitSymptoms(symptoms);
      setResult(res);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to analyze symptoms";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const data = result?.data;
  const severityColors: Record<string, string> = {
    LOW: "bg-green-100 text-green-800 border-green-300",
    MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-300",
    HIGH: "bg-orange-100 text-orange-800 border-orange-300",
    CRITICAL: "bg-red-100 text-red-800 border-red-300",
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
        ← Back to Dashboard
      </Link>

      <h1 className="mt-4 mb-6 text-2xl font-bold text-gray-900">
        Describe Your Symptoms
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          rows={4}
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          placeholder="Tell us what you're feeling... e.g., I have fever and headache since 2 days"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          required
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Analyzing your symptoms..." : "Get Assessment"}
        </button>
      </form>

      {/* Results Display */}
      {data && (
        <div className="mt-8 space-y-6">
          {/* Emergency Alert */}
          {data.decision.escalate_to_emergency && (
            <div className="rounded-lg border-2 border-red-500 bg-red-50 p-4">
              <h2 className="text-lg font-bold text-red-800">
                🚨 Emergency — Call 108 Immediately
              </h2>
              <p className="mt-1 text-red-700">
                Your symptoms require immediate medical attention.
              </p>
            </div>
          )}

          {/* Severity Badge */}
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full border px-4 py-1 text-sm font-semibold ${
                severityColors[data.decision.severity] || severityColors.LOW
              }`}
            >
              {data.decision.severity} Severity
            </span>
            {data.decision.urgency_hours && (
              <span className="text-sm text-gray-600">
                See a doctor within {data.decision.urgency_hours} hours
              </span>
            )}
          </div>

          {/* Possible Condition */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h2 className="font-semibold text-blue-900">
              Possible Condition
            </h2>
            <p className="mt-1 text-blue-800 capitalize">
              {data.triage.possible_condition_category}
            </p>
            <p className="mt-2 text-sm text-blue-700">
              Body system: <span className="capitalize">{data.triage.body_system}</span>
            </p>
            {data.triage.notes && (
              <p className="mt-2 text-sm text-gray-600 italic">
                {data.triage.notes}
              </p>
            )}
          </div>

          {/* Reassurance Message */}
          {data.suggestion.reassurance_message && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <p className="text-green-800">
                💚 {data.suggestion.reassurance_message}
              </p>
            </div>
          )}

          {/* Immediate Actions */}
          {data.suggestion.immediate_actions.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="font-semibold text-gray-900">⚡ Do This Now</h3>
              <ul className="mt-2 space-y-1">
                {data.suggestion.immediate_actions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-0.5 text-blue-500">•</span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Home Care Instructions */}
          {data.suggestion.home_care_instructions.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="font-semibold text-gray-900">🏠 Home Care</h3>
              <ul className="mt-2 space-y-1">
                {data.suggestion.home_care_instructions.map((inst, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-0.5 text-green-500">•</span>
                    {inst}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* OTC Medicine Suggestions */}
          {data.suggestion.otc_suggestions.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="font-semibold text-gray-900">💊 Medicine You Can Take</h3>
              <ul className="mt-2 space-y-1">
                {data.suggestion.otc_suggestions.map((med, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-0.5 text-purple-500">•</span>
                    {med}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* What to Avoid */}
          {data.suggestion.what_to_avoid.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="font-semibold text-gray-900">❌ Avoid</h3>
              <ul className="mt-2 space-y-1">
                {data.suggestion.what_to_avoid.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-0.5 text-red-400">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warning Signs */}
          {data.suggestion.warning_signs.length > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
              <h3 className="font-semibold text-orange-900">
                ⚠️ See a Doctor Immediately If
              </h3>
              <ul className="mt-2 space-y-1">
                {data.suggestion.warning_signs.map((sign, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-orange-800">
                    <span className="mt-0.5">•</span>
                    {sign}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Doctor Recommendation */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="font-semibold text-gray-900">👨‍⚕️ Recommended Doctor</h3>
            <p className="mt-1 text-gray-700">
              {data.doctor_recommendation.primary_specialty}
            </p>
            {data.doctor_recommendation.secondary_specialty && (
              <p className="text-sm text-gray-500">
                Alternative: {data.doctor_recommendation.secondary_specialty}
              </p>
            )}
            {data.doctor_recommendation.telemedicine_suitable && (
              <p className="mt-1 text-sm text-blue-600">
                💻 Telemedicine consultation is suitable
              </p>
            )}
          </div>

          {/* Follow-up */}
          {data.suggestion.follow_up_in_hours && (
            <p className="text-sm text-gray-600 text-center">
              📅 Check back in {data.suggestion.follow_up_in_hours} hours if not improving
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => router.push("/appointments/book")}
              className="flex-1 rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700"
            >
              Book Appointment
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="flex-1 rounded-lg border border-gray-300 py-3 font-medium text-gray-700 hover:bg-gray-50"
            >
              Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
