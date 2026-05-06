"use client";

export const dynamic = "force-dynamic";

import { useState, useRef, useEffect } from "react";
import { submitFollowup, analyzeSymptomImage } from "@/lib/api";
import Link from "next/link";

interface HealthEntry {
  id: string;
  date: string;
  pain_score: number;
  medicine_taken: boolean;
  notes: string;
  image?: string;
  ai_assessment?: {
    status: string;
    risk_level: string;
    trend: string;
    message: string;
    recommendations: string[];
  };
}

// Mock history for demo
const MOCK_HISTORY: HealthEntry[] = [
  {
    id: "h-001",
    date: "2026-05-05",
    pain_score: 7,
    medicine_taken: true,
    notes: "High fever, body ache, couldn't sleep well",
    ai_assessment: {
      status: "DETERIORATING",
      risk_level: "MEDIUM",
      trend: "worsening",
      message: "Your fever seems high. Monitor closely and take paracetamol.",
      recommendations: ["Rest completely", "Drink fluids every hour", "Take temperature every 4 hours"],
    },
  },
  {
    id: "h-002",
    date: "2026-05-06",
    pain_score: 5,
    medicine_taken: true,
    notes: "Fever reduced, still have headache",
    ai_assessment: {
      status: "IMPROVING",
      risk_level: "LOW",
      trend: "improving",
      message: "Good progress! Fever is coming down. Keep taking medicines on time.",
      recommendations: ["Continue rest", "Light food like khichdi", "Keep hydrated"],
    },
  },
  {
    id: "h-003",
    date: "2026-05-07",
    pain_score: 3,
    medicine_taken: true,
    notes: "Much better today, mild headache only",
    ai_assessment: {
      status: "IMPROVING",
      risk_level: "LOW",
      trend: "improving",
      message: "Great recovery! You're on the right track. One more day of rest should help.",
      recommendations: ["Continue medicines", "Can resume light activities tomorrow"],
    },
  },
];

export default function HealthMonitorPage() {
  const [history, setHistory] = useState<HealthEntry[]>(MOCK_HISTORY);
  const [painScore, setPainScore] = useState(5);
  const [medicineTaken, setMedicineTaken] = useState(true);
  const [notes, setNotes] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [latestAssessment, setLatestAssessment] = useState<HealthEntry["ai_assessment"] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // If image uploaded, analyze it
      let imageAnalysis = "";
      if (image) {
        try {
          const imgRes = await analyzeSymptomImage(image);
          imageAnalysis = imgRes.data?.reasoning || imgRes.data?.possible_condition_category || "";
        } catch {
          imageAnalysis = "Image analysis unavailable";
        }
      }

      // Submit follow-up check-in
      const fullNotes = imageAnalysis ? `${notes}. Visual: ${imageAnalysis}` : notes;

      let aiResult;
      try {
        const res = await submitFollowup({
          episode_id: "ep-001",
          pain_score: painScore,
          medicine_taken: medicineTaken,
          new_symptoms: fullNotes,
        });
        aiResult = res.data;
      } catch {
        // Mock AI response if backend unavailable
        aiResult = generateMockAssessment(painScore, medicineTaken, notes, history);
      }

      const newEntry: HealthEntry = {
        id: `h-${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        pain_score: painScore,
        medicine_taken: medicineTaken,
        notes: notes,
        image: imagePreview || undefined,
        ai_assessment: {
          status: aiResult.recovery_status || aiResult.status || "STABLE",
          risk_level: getRiskLevel(painScore, history),
          trend: aiResult.symptom_trend || aiResult.trend || getTrend(painScore, history),
          message: aiResult.patient_message || aiResult.message || "Check-in recorded.",
          recommendations: aiResult.next_checkin_questions || aiResult.recommendations || [],
        },
      };

      setHistory([...history, newEntry]);
      setLatestAssessment(newEntry.ai_assessment);

      // Reset form
      setNotes("");
      setPainScore(5);
      setImage(null);
      setImagePreview(null);
    } finally {
      setLoading(false);
    }
  }

  function getRiskLevel(currentPain: number, hist: HealthEntry[]): string {
    if (currentPain >= 8) return "HIGH";
    if (hist.length >= 2) {
      const lastPain = hist[hist.length - 1].pain_score;
      if (currentPain > lastPain + 2) return "HIGH";
      if (currentPain > lastPain) return "MEDIUM";
    }
    if (currentPain >= 5) return "MEDIUM";
    return "LOW";
  }

  function getTrend(currentPain: number, hist: HealthEntry[]): string {
    if (hist.length === 0) return "stable";
    const lastPain = hist[hist.length - 1].pain_score;
    if (currentPain < lastPain) return "improving";
    if (currentPain > lastPain) return "worsening";
    return "stable";
  }

  function generateMockAssessment(pain: number, medTaken: boolean, note: string, hist: HealthEntry[]) {
    const trend = getTrend(pain, hist);
    const risk = getRiskLevel(pain, hist);

    if (risk === "HIGH") {
      return {
        recovery_status: "DETERIORATING",
        symptom_trend: "worsening",
        patient_message: "⚠️ Your symptoms are getting worse. Please contact your doctor or visit the hospital if pain continues to increase.",
        next_checkin_questions: ["Monitor temperature every 2 hours", "Call 108 if breathing difficulty", "Do not skip medicines"],
      };
    }
    if (trend === "improving") {
      return {
        recovery_status: "IMPROVING",
        symptom_trend: "improving",
        patient_message: "Good news! You're recovering well. Keep following your treatment plan.",
        next_checkin_questions: ["Continue medicines on time", "Eat light nutritious food", "Get adequate sleep"],
      };
    }
    if (!medTaken) {
      return {
        recovery_status: "NOT_ADHERING",
        symptom_trend: "stable",
        patient_message: "It's important to take your medicines regularly for faster recovery. Please don't skip doses.",
        next_checkin_questions: ["Set a reminder for medicine times", "Take medicines with food if causing nausea"],
      };
    }
    return {
      recovery_status: "STABLE",
      symptom_trend: "stable",
      patient_message: "Your condition is stable. Continue monitoring and take medicines on time.",
      next_checkin_questions: ["Rest well", "Stay hydrated", "Check in again tomorrow"],
    };
  }

  const riskColors: Record<string, string> = {
    LOW: "bg-green-100 text-green-800 border-green-300",
    MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-300",
    HIGH: "bg-red-100 text-red-800 border-red-300",
  };

  const statusEmoji: Record<string, string> = {
    IMPROVING: "🟢",
    STABLE: "🟡",
    DETERIORATING: "🔴",
    NOT_ADHERING: "⚠️",
    CURED: "🎉",
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-20">
      <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">← Dashboard</Link>

      <h1 className="mt-4 mb-2 text-2xl font-bold text-gray-900">Health Monitor</h1>
      <p className="text-sm text-gray-500 mb-6">Track your recovery daily. AI monitors your progress and alerts you to risks.</p>

      {/* Latest AI Assessment */}
      {latestAssessment && (
        <div className={`mb-6 rounded-lg border p-4 ${riskColors[latestAssessment.risk_level] || "border-gray-200 bg-gray-50"}`}>
          <div className="flex items-center gap-2 mb-2">
            <span>{statusEmoji[latestAssessment.status] || "🟡"}</span>
            <span className="font-semibold text-sm">{latestAssessment.status}</span>
            <span className="text-xs">• Risk: {latestAssessment.risk_level}</span>
            <span className="text-xs">• Trend: {latestAssessment.trend}</span>
          </div>
          <p className="text-sm">{latestAssessment.message}</p>
          {latestAssessment.recommendations.length > 0 && (
            <ul className="mt-2 space-y-1">
              {latestAssessment.recommendations.map((r, i) => (
                <li key={i} className="text-xs">• {r}</li>
              ))}
            </ul>
          )}

          {/* HIGH RISK — Emergency: Cancel appointment, go to hospital */}
          {latestAssessment.risk_level === "HIGH" && (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg bg-red-600 p-3 text-white">
                <p className="font-bold text-sm">🚨 URGENT ACTION REQUIRED</p>
                <p className="text-xs mt-1">
                  Your condition has worsened significantly. Do NOT wait for your scheduled appointment.
                  Go to the nearest hospital emergency immediately or call 108.
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href="tel:108"
                  className="flex-1 rounded-lg bg-red-600 py-2 text-center text-sm font-medium text-white"
                >
                  📞 Call 108 (Ambulance)
                </a>
                <button
                  onClick={() => alert("Appointment cancelled. Please visit the nearest hospital.")}
                  className="flex-1 rounded-lg border border-red-300 py-2 text-center text-sm font-medium text-red-700"
                >
                  ❌ Cancel Appointment
                </button>
              </div>
              <div className="rounded bg-red-50 p-2">
                <p className="text-xs text-red-800 font-medium">While going to hospital:</p>
                <ul className="text-xs text-red-700 mt-1 space-y-0.5">
                  <li>• Do not drive yourself — ask someone to take you</li>
                  <li>• Carry your prescription and Aadhaar card</li>
                  <li>• Note your current temperature and symptoms</li>
                  <li>• Inform your emergency contact</li>
                </ul>
              </div>
            </div>
          )}

          {/* CURED / IMPROVING after appointment — Wellness maintenance plan */}
          {(latestAssessment.status === "CURED" || (latestAssessment.status === "IMPROVING" && latestAssessment.risk_level === "LOW")) && history.length >= 3 && (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg bg-green-600 p-3 text-white">
                <p className="font-bold text-sm">✅ You're Recovering Well!</p>
                <p className="text-xs mt-1">
                  Your condition is improving steadily. Here's how to maintain your health going forward.
                </p>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-sm font-semibold text-green-900 mb-2">🌿 Wellness Maintenance Plan</p>
                <ul className="space-y-2 text-xs text-green-800">
                  <li className="flex items-start gap-2">
                    <span>💊</span>
                    <span><strong>Complete your medicine course</strong> — Don't stop early even if you feel better. Incomplete courses can cause relapse.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>🥗</span>
                    <span><strong>Eat nutritious food</strong> — Include fruits, vegetables, dal, and curd. Avoid oily/spicy food for a few more days.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>💧</span>
                    <span><strong>Stay hydrated</strong> — Drink 8-10 glasses of water daily. Coconut water and buttermilk are excellent.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>😴</span>
                    <span><strong>Get proper sleep</strong> — 7-8 hours of sleep helps your body recover fully.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>🏃</span>
                    <span><strong>Resume activity gradually</strong> — Start with light walks. Avoid heavy exercise for 1 week.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>🔄</span>
                    <span><strong>Follow-up visit</strong> — Keep your follow-up appointment to confirm full recovery.</span>
                  </li>
                </ul>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm font-semibold text-blue-900 mb-1">🛡️ Prevent Recurrence</p>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Wash hands frequently, especially before eating</li>
                  <li>• Avoid crowded places for a few more days</li>
                  <li>• Keep your immunity strong — Vitamin C, turmeric milk</li>
                  <li>• If symptoms return, start a new check-in immediately</li>
                </ul>
              </div>
              <Link
                href="/chat"
                className="block rounded-lg border border-gray-300 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                🩺 Start New Symptom Analysis (if symptoms return)
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Progress Chart */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Pain Score Trend</h3>
        <div className="flex items-end gap-1 h-20">
          {history.map((entry, i) => (
            <div key={entry.id} className="flex flex-col items-center flex-1">
              <div
                className={`w-full rounded-t ${
                  entry.pain_score >= 7 ? "bg-red-400" :
                  entry.pain_score >= 4 ? "bg-yellow-400" : "bg-green-400"
                }`}
                style={{ height: `${(entry.pain_score / 10) * 100}%` }}
              />
              <span className="text-xs text-gray-400 mt-1">{entry.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Check-in Form */}
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="font-semibold text-gray-900">Today's Check-in</h3>

        {/* Pain Score Slider */}
        <div>
          <label className="text-sm text-gray-700 flex justify-between">
            <span>Pain Score</span>
            <span className={`font-bold ${painScore >= 7 ? "text-red-600" : painScore >= 4 ? "text-yellow-600" : "text-green-600"}`}>
              {painScore}/10
            </span>
          </label>
          <input
            type="range"
            min="0"
            max="10"
            value={painScore}
            onChange={(e) => setPainScore(Number(e.target.value))}
            className="w-full mt-1"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>No pain</span>
            <span>Severe</span>
          </div>
        </div>

        {/* Medicine Taken */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={medicineTaken}
            onChange={(e) => setMedicineTaken(e.target.checked)}
            className="h-5 w-5 rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm text-gray-700">I took all my medicines today</span>
        </label>

        {/* Notes */}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How are you feeling? Any new symptoms?"
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        {/* Photo Upload */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            📷 {imagePreview ? "Change Photo" : "Add Photo"}
          </button>
          {imagePreview && (
            <img src={imagePreview} alt="Condition" className="h-12 w-12 rounded-lg object-cover" />
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageChange}
            className="hidden"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Submit Check-in"}
        </button>
      </form>

      {/* History */}
      <div className="mt-6">
        <h3 className="font-semibold text-gray-900 mb-3">History</h3>
        <div className="space-y-3">
          {[...history].reverse().map((entry) => (
            <div key={entry.id} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-800">{entry.date}</span>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    entry.pain_score >= 7 ? "bg-red-100 text-red-700" :
                    entry.pain_score >= 4 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
                  }`}>
                    Pain: {entry.pain_score}/10
                  </span>
                  {entry.medicine_taken && <span className="text-xs text-green-600">💊 ✓</span>}
                </div>
              </div>
              <p className="text-xs text-gray-600">{entry.notes}</p>
              {entry.image && <img src={entry.image} alt="Condition" className="mt-2 h-16 rounded-lg object-cover" />}
              {entry.ai_assessment && (
                <div className="mt-2 rounded bg-gray-50 p-2">
                  <p className="text-xs text-gray-700">
                    {statusEmoji[entry.ai_assessment.status]} {entry.ai_assessment.message}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

