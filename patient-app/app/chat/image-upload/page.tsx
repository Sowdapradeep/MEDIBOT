"use client";

import { useState, useRef } from "react";
import { analyzeSymptomImage } from "@/lib/api";
import Link from "next/link";

interface AnalysisResult {
  status: string;
  data: {
    body_system: string;
    possible_condition_category: string;
    visual_observations: string[];
    severity: string;
    urgency_hours: number | null;
    confidence: number;
    immediate_flag: boolean;
    reasoning: string;
    home_care_suggestions: string[];
    warning_signs: string[];
    recommended_specialist: string;
    see_doctor_recommendation: string;
    notes: string;
  };
}

export default function ImageUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setResult(null);
      setError("");
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError("");

    try {
      const res = await analyzeSymptomImage(file);
      setResult(res);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Analysis failed";
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

      <h1 className="mt-4 mb-2 text-2xl font-bold text-gray-900">
        Photo Symptom Analysis
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        Upload a photo of your symptom (rash, wound, swelling, skin issue) and
        our AI will analyze it.
      </p>

      <form onSubmit={handleUpload} className="space-y-4">
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white p-8 hover:border-purple-400 transition-colors"
          role="button"
          tabIndex={0}
        >
          {preview ? (
            <img
              src={preview}
              alt="Symptom photo preview"
              className="max-h-64 rounded-lg object-contain"
            />
          ) : (
            <>
              <span className="text-5xl">📸</span>
              <p className="mt-3 text-sm text-gray-500">
                Tap to take a photo or select from gallery
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Show the affected area clearly with good lighting
              </p>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={!file || loading}
          className="w-full rounded-lg bg-purple-600 py-3 font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? "Analyzing image..." : "Analyze Symptom"}
        </button>
      </form>

      {/* Analysis Results */}
      {data && (
        <div className="mt-8 space-y-5">
          {/* Emergency Alert */}
          {data.immediate_flag && (
            <div className="rounded-lg border-2 border-red-500 bg-red-50 p-4">
              <h2 className="text-lg font-bold text-red-800">
                🚨 Seek Immediate Medical Help
              </h2>
              <p className="mt-1 text-red-700">
                This appears serious. Please visit a hospital or call 108 immediately.
              </p>
            </div>
          )}

          {/* Severity + Body System */}
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className={`rounded-full border px-4 py-1 text-sm font-semibold ${
                severityColors[data.severity] || severityColors.LOW
              }`}
            >
              {data.severity} Severity
            </span>
            {data.urgency_hours && (
              <span className="text-sm text-gray-600">
                See a doctor within {data.urgency_hours} hours
              </span>
            )}
          </div>

          {/* Possible Condition */}
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
            <h3 className="font-semibold text-purple-900">Possible Condition</h3>
            <p className="mt-1 text-purple-800 capitalize text-lg">
              {data.possible_condition_category}
            </p>
            <p className="mt-1 text-sm text-purple-700">
              Body system: <span className="capitalize">{data.body_system}</span>
              {" • "}Confidence: {Math.round(data.confidence * 100)}%
            </p>
          </div>

          {/* AI Reasoning */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="font-semibold text-blue-900">Assessment</h3>
            <p className="mt-1 text-sm text-blue-800">{data.reasoning}</p>
          </div>

          {/* Visual Observations */}
          {data.visual_observations && data.visual_observations.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="font-semibold text-gray-900">👁️ What We Observed</h3>
              <ul className="mt-2 space-y-1">
                {data.visual_observations.map((obs, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-0.5 text-purple-500">•</span>
                    {obs}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Doctor Recommendation */}
          {data.see_doctor_recommendation && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <h3 className="font-semibold text-green-900">👨‍⚕️ Doctor Advice</h3>
              <p className="mt-1 text-sm text-green-800">
                {data.see_doctor_recommendation}
              </p>
              <p className="mt-2 text-sm text-green-700">
                Recommended specialist: <span className="font-medium">{data.recommended_specialist}</span>
              </p>
            </div>
          )}

          {/* Home Care */}
          {data.home_care_suggestions && data.home_care_suggestions.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="font-semibold text-gray-900">🏠 Home Care</h3>
              <ul className="mt-2 space-y-1">
                {data.home_care_suggestions.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-0.5 text-green-500">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warning Signs */}
          {data.warning_signs && data.warning_signs.length > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
              <h3 className="font-semibold text-orange-900">⚠️ See a Doctor If</h3>
              <ul className="mt-2 space-y-1">
                {data.warning_signs.map((sign, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-orange-800">
                    <span className="mt-0.5">•</span>
                    {sign}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Notes */}
          {data.notes && (
            <p className="text-sm text-gray-500 italic text-center">{data.notes}</p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Link
              href="/appointments/book"
              className="flex-1 rounded-lg bg-blue-600 py-3 text-center font-medium text-white hover:bg-blue-700"
            >
              Book Appointment
            </Link>
            <Link
              href="/dashboard"
              className="flex-1 rounded-lg border border-gray-300 py-3 text-center font-medium text-gray-700 hover:bg-gray-50"
            >
              Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
