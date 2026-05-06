"use client";

export const dynamic = "force-dynamic";

import { useState, useRef } from "react";
import { analyzeSymptomImage } from "@/lib/api";
import Link from "next/link";

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration_days: number;
  timing: string;
  reminder_times: string[];
}

interface PrescriptionData {
  id: string;
  medicines: Medicine[];
  doctor_name: string;
  diagnosis: string;
  date: string;
  follow_up_date: string;
  status: "active" | "completed" | "discontinued";
}

interface DayLog {
  day: number;
  date: string;
  medicines_taken: boolean;
  pain_score: number;
  notes: string;
  ai_verdict: string;
  trend: "improving" | "stable" | "worsening";
}

interface PrescriptionHistory {
  prescription: PrescriptionData;
  dayLogs: DayLog[];
  outcome: string;
}

// Mock history of past prescriptions
const MOCK_HISTORY: PrescriptionHistory[] = [
  {
    prescription: {
      id: "rx-old-001",
      medicines: [
        { name: "Azithromycin 500mg", dosage: "500mg", frequency: "OD", duration_days: 3, timing: "After food", reminder_times: ["09:00"] },
        { name: "Montelukast 10mg", dosage: "10mg", frequency: "OD", duration_days: 14, timing: "At bedtime", reminder_times: ["22:00"] },
      ],
      doctor_name: "Dr. Ravi Kumar",
      diagnosis: "Bronchitis with Allergic Rhinitis",
      date: "2026-04-15",
      follow_up_date: "2026-04-22",
      status: "completed",
    },
    dayLogs: [
      { day: 1, date: "2026-04-15", medicines_taken: true, pain_score: 6, notes: "Severe cough, runny nose", ai_verdict: "Starting treatment.", trend: "stable" },
      { day: 3, date: "2026-04-17", medicines_taken: true, pain_score: 4, notes: "Cough reducing", ai_verdict: "Improving well.", trend: "improving" },
      { day: 7, date: "2026-04-21", medicines_taken: true, pain_score: 1, notes: "Almost normal", ai_verdict: "Nearly recovered.", trend: "improving" },
    ],
    outcome: "✅ Fully recovered in 7 days",
  },
  {
    prescription: {
      id: "rx-old-002",
      medicines: [
        { name: "Omeprazole 20mg", dosage: "20mg", frequency: "BD", duration_days: 14, timing: "Before food", reminder_times: ["07:00", "19:00"] },
        { name: "Domperidone 10mg", dosage: "10mg", frequency: "TID", duration_days: 7, timing: "Before food", reminder_times: ["07:00", "13:00", "19:00"] },
      ],
      doctor_name: "Dr. Fathima Begum",
      diagnosis: "Gastritis with GERD",
      date: "2026-03-20",
      follow_up_date: "2026-04-03",
      status: "completed",
    },
    dayLogs: [
      { day: 1, date: "2026-03-20", medicines_taken: true, pain_score: 8, notes: "Severe acidity, burning", ai_verdict: "Acute phase. Avoid spicy food.", trend: "stable" },
      { day: 5, date: "2026-03-24", medicines_taken: true, pain_score: 4, notes: "Much better", ai_verdict: "Responding to treatment.", trend: "improving" },
      { day: 14, date: "2026-04-02", medicines_taken: true, pain_score: 1, notes: "Fully normal", ai_verdict: "Resolved. Maintain diet.", trend: "improving" },
    ],
    outcome: "✅ Resolved in 14 days. Diet modification advised.",
  },
];

// Current active prescription
const MOCK_ACTIVE: PrescriptionData = {
  id: "rx-001",
  medicines: [
    { name: "Amoxicillin 500mg", dosage: "500mg", frequency: "TID", duration_days: 7, timing: "After food", reminder_times: ["08:00", "14:00", "20:00"] },
    { name: "Paracetamol 650mg", dosage: "650mg", frequency: "BD", duration_days: 5, timing: "After food", reminder_times: ["08:00", "20:00"] },
    { name: "Cetirizine 10mg", dosage: "10mg", frequency: "OD", duration_days: 5, timing: "At bedtime", reminder_times: ["22:00"] },
    { name: "Pantoprazole 40mg", dosage: "40mg", frequency: "OD", duration_days: 7, timing: "Before food", reminder_times: ["07:00"] },
  ],
  doctor_name: "Dr. Priya Sharma",
  diagnosis: "Upper Respiratory Tract Infection with Acid Reflux",
  date: "2026-05-06",
  follow_up_date: "2026-05-13",
  status: "active",
};

const MOCK_DAY_LOGS: DayLog[] = [
  { day: 1, date: "2026-05-06", medicines_taken: true, pain_score: 7, notes: "High fever 102°F, severe headache", ai_verdict: "Day 1. Symptoms expected. Monitor fever.", trend: "stable" },
  { day: 2, date: "2026-05-07", medicines_taken: true, pain_score: 6, notes: "Fever reduced to 100°F", ai_verdict: "Antibiotics working. Continue.", trend: "improving" },
  { day: 3, date: "2026-05-08", medicines_taken: true, pain_score: 4, notes: "No fever, mild cough", ai_verdict: "Good progress! Cough may persist 2-3 days.", trend: "improving" },
  { day: 4, date: "2026-05-09", medicines_taken: false, pain_score: 5, notes: "Missed dose, headache returned", ai_verdict: "⚠️ Don't skip antibiotics — causes resistance.", trend: "worsening" },
  { day: 5, date: "2026-05-10", medicines_taken: true, pain_score: 3, notes: "Back on track, much better", ai_verdict: "Recovery on track. 2 days remaining.", trend: "improving" },
];

export default function PrescriptionPage() {
  const [activePrescription, setActivePrescription] = useState<PrescriptionData | null>(MOCK_ACTIVE);
  const [dayLogs, setDayLogs] = useState<DayLog[]>(MOCK_DAY_LOGS);
  const [history, setHistory] = useState<PrescriptionHistory[]>(MOCK_HISTORY);
  const [uploading, setUploading] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<PrescriptionData | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [tab, setTab] = useState<"active" | "history">("active");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Daily entry state
  const [todayPain, setTodayPain] = useState(3);
  const [todayMeds, setTodayMeds] = useState(true);
  const [todayNotes, setTodayNotes] = useState("");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setUploading(true);
    setShowAnalysis(false);

    try {
      // Simulate AI parsing (in production: Textract + Bedrock)
      await new Promise((r) => setTimeout(r, 2500));

      const newRx: PrescriptionData = {
        id: `rx-${Date.now()}`,
        medicines: [
          { name: "Doxycycline 100mg", dosage: "100mg", frequency: "BD", duration_days: 7, timing: "After food", reminder_times: ["09:00", "21:00"] },
          { name: "Ibuprofen 400mg", dosage: "400mg", frequency: "TID", duration_days: 5, timing: "After food", reminder_times: ["08:00", "14:00", "20:00"] },
          { name: "Cough Syrup 5ml", dosage: "5ml", frequency: "TID", duration_days: 5, timing: "After food", reminder_times: ["08:00", "14:00", "20:00"] },
        ],
        doctor_name: "Dr. Meena Iyer",
        diagnosis: "Bacterial Sinusitis",
        date: new Date().toISOString().split("T")[0],
        follow_up_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
        status: "active",
      };

      setAnalysisResult(newRx);
      setShowAnalysis(true);
    } finally {
      setUploading(false);
    }
  }

  function confirmNewPrescription() {
    if (!analysisResult) return;

    // Save current active to history
    if (activePrescription) {
      setHistory([
        {
          prescription: { ...activePrescription, status: "completed" },
          dayLogs: [...dayLogs],
          outcome: dayLogs.length > 0 && dayLogs[dayLogs.length - 1].pain_score <= 3
            ? "✅ Recovered successfully"
            : "⏸️ Switched to new treatment",
        },
        ...history,
      ]);
    }

    // Set new prescription as active
    setActivePrescription(analysisResult);
    setDayLogs([]);
    setShowAnalysis(false);
    setAnalysisResult(null);
    setPreview(null);
    setTab("active");
  }

  function submitDailyLog() {
    const lastLog = dayLogs[dayLogs.length - 1];
    const newDay = (lastLog?.day || 0) + 1;
    const trend: DayLog["trend"] = todayPain < (lastLog?.pain_score || 5) ? "improving" : todayPain > (lastLog?.pain_score || 5) ? "worsening" : "stable";

    let verdict = "";
    if (!todayMeds) verdict = "⚠️ Missed medicines. Complete your course to avoid relapse.";
    else if (trend === "worsening") verdict = "🔴 Symptoms worsening. Contact doctor if this continues.";
    else if (todayPain <= 2) verdict = "🎉 Almost recovered! Complete remaining course.";
    else if (trend === "improving") verdict = "🟢 Illness resolving. Continue treatment.";
    else verdict = "🟡 Stable. Take medicines on time.";

    setDayLogs([...dayLogs, {
      day: newDay,
      date: new Date().toISOString().split("T")[0],
      medicines_taken: todayMeds,
      pain_score: todayPain,
      notes: todayNotes,
      ai_verdict: verdict,
      trend,
    }]);
    setTodayNotes("");
    setTodayPain(3);
  }

  const totalDays = activePrescription?.medicines[0]?.duration_days || 7;
  const completedDays = dayLogs.length;
  const progressPercent = Math.min(100, Math.round((completedDays / totalDays) * 100));
  const isResolving = dayLogs.length >= 2 && dayLogs[dayLogs.length - 1].pain_score < dayLogs[0].pain_score;

  const trendColors = { improving: "text-green-600", stable: "text-yellow-600", worsening: "text-red-600" };
  const trendIcons = { improving: "📈", stable: "➡️", worsening: "📉" };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-20">
      <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">← Dashboard</Link>
      <h1 className="mt-4 mb-4 text-2xl font-bold text-gray-900">Prescription & Monitoring</h1>

      {/* Tabs */}
      <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1 mb-5">
        <button
          onClick={() => setTab("active")}
          className={`flex-1 rounded-md py-2 text-sm font-medium ${tab === "active" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500"}`}
        >
          Active Rx
        </button>
        <button
          onClick={() => setTab("history")}
          className={`flex-1 rounded-md py-2 text-sm font-medium ${tab === "history" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500"}`}
        >
          History ({history.length})
        </button>
      </div>

      {/* ACTIVE TAB */}
      {tab === "active" && (
        <>
          {/* Upload New Prescription */}
          <div className="mb-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-lg bg-purple-600 py-3 text-sm font-medium text-white hover:bg-purple-700 shadow-sm"
            >
              📋 Upload New Prescription
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleUpload} className="hidden" />
          </div>

          {/* Uploading State */}
          {uploading && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
              {preview && <img src={preview} alt="Prescription" className="mx-auto max-h-32 rounded-lg mb-3" />}
              <p className="text-sm text-blue-700 animate-pulse">🔍 Analyzing prescription with AI...</p>
              <p className="text-xs text-blue-500 mt-1">Reading medicines, dosages, and schedule</p>
            </div>
          )}

          {/* Analysis Result — Confirm */}
          {showAnalysis && analysisResult && (
            <div className="mb-4 rounded-lg border-2 border-green-300 bg-green-50 p-4">
              <h3 className="font-semibold text-green-900 mb-2">✅ Prescription Parsed Successfully</h3>
              <p className="text-sm text-green-800"><strong>Diagnosis:</strong> {analysisResult.diagnosis}</p>
              <p className="text-sm text-green-800"><strong>Doctor:</strong> Dr. {analysisResult.doctor_name}</p>
              <p className="text-sm text-green-800"><strong>Medicines:</strong> {analysisResult.medicines.length} found</p>
              <ul className="mt-2 space-y-1">
                {analysisResult.medicines.map((m, i) => (
                  <li key={i} className="text-xs text-green-700">• {m.name} — {m.frequency === "OD" ? "Once" : m.frequency === "BD" ? "Twice" : "Thrice"} daily, {m.duration_days} days</li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <button onClick={confirmNewPrescription} className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700">
                  ✓ Start Monitoring
                </button>
                <button onClick={() => { setShowAnalysis(false); setAnalysisResult(null); }} className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-600">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Active Prescription Card */}
          {activePrescription && !showAnalysis && (
            <>
              <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
                <p className="font-semibold text-purple-900">📋 {activePrescription.diagnosis}</p>
                <p className="text-sm text-purple-700 mt-1">Dr. {activePrescription.doctor_name} • {activePrescription.date}</p>
                <p className="text-xs text-purple-600">Follow-up: {activePrescription.follow_up_date}</p>
              </div>

              {/* Progress */}
              <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Treatment Progress</span>
                  <span className="text-sm font-bold text-blue-700">{progressPercent}%</span>
                </div>
                <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
                  <div className={`h-full rounded-full ${isResolving ? "bg-green-500" : "bg-yellow-500"}`} style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-400">Day {completedDays}/{totalDays}</span>
                  <span className={`text-xs font-medium ${isResolving ? "text-green-600" : "text-yellow-600"}`}>
                    {isResolving ? "✅ Illness resolving" : "⏳ Monitoring..."}
                  </span>
                </div>
              </div>

              {/* Medicines */}
              <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">💊 Medicines ({activePrescription.medicines.length})</h3>
                {activePrescription.medicines.map((med, i) => (
                  <div key={i} className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 mb-1">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{med.name}</p>
                      <p className="text-xs text-gray-500">{med.timing} • {med.frequency === "OD" ? "Once" : med.frequency === "BD" ? "Twice" : "Thrice"} daily • {med.duration_days} days</p>
                    </div>
                    <div className="flex gap-1">
                      {med.reminder_times.map((t, j) => (
                        <span key={j} className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{t}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Daily Check-in */}
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-3">📝 Day {completedDays + 1} Update</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-600 flex justify-between">
                      <span>Pain/Discomfort</span>
                      <span className="font-bold">{todayPain}/10</span>
                    </label>
                    <input type="range" min="0" max="10" value={todayPain} onChange={(e) => setTodayPain(Number(e.target.value))} className="w-full" />
                  </div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={todayMeds} onChange={(e) => setTodayMeds(e.target.checked)} className="h-4 w-4 rounded" />
                    <span className="text-sm text-gray-700">Took all medicines today</span>
                  </label>
                  <input type="text" value={todayNotes} onChange={(e) => setTodayNotes(e.target.value)} placeholder="How are you feeling?" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                  <button onClick={submitDailyLog} className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700">
                    Submit Update
                  </button>
                </div>
              </div>

              {/* Day-wise Log */}
              {dayLogs.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">📊 Recovery Log</h3>
                  {[...dayLogs].reverse().map((log) => (
                    <div key={log.day} className="rounded-lg border border-gray-200 bg-white p-3 mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">Day {log.day} — {log.date}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs ${trendColors[log.trend]}`}>{trendIcons[log.trend]} {log.trend}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${log.pain_score >= 7 ? "bg-red-100 text-red-700" : log.pain_score >= 4 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                            {log.pain_score}/10
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600">{log.notes}</p>
                      <p className="text-xs mt-1 text-gray-500">{log.medicines_taken ? "💊 ✓" : "❌ Missed"}</p>
                      <div className="mt-1 rounded bg-gray-50 p-2">
                        <p className="text-xs text-gray-700"><strong>AI:</strong> {log.ai_verdict}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* No active prescription */}
          {!activePrescription && !showAnalysis && !uploading && (
            <div className="text-center py-8 text-gray-500">
              <span className="text-4xl">📋</span>
              <p className="mt-2 text-sm">No active prescription. Upload one after your hospital visit.</p>
            </div>
          )}
        </>
      )}

      {/* HISTORY TAB */}
      {tab === "history" && (
        <div className="space-y-4">
          {history.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-8">No past prescriptions yet.</p>
          ) : (
            history.map((item, idx) => (
              <div key={idx} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{item.prescription.diagnosis}</p>
                    <p className="text-sm text-gray-500">Dr. {item.prescription.doctor_name}</p>
                    <p className="text-xs text-gray-400">{item.prescription.date} • {item.prescription.medicines.length} medicines</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    item.prescription.status === "completed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {item.prescription.status}
                  </span>
                </div>

                {/* Mini progress */}
                <div className="flex items-center gap-2 mb-2">
                  {item.dayLogs.map((log, i) => (
                    <div key={i} className={`h-2 flex-1 rounded-full ${
                      log.pain_score >= 7 ? "bg-red-300" : log.pain_score >= 4 ? "bg-yellow-300" : "bg-green-300"
                    }`} title={`Day ${log.day}: ${log.pain_score}/10`} />
                  ))}
                </div>

                <p className="text-xs text-gray-600">{item.outcome}</p>

                {/* Medicines summary */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.prescription.medicines.map((m, i) => (
                    <span key={i} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{m.name}</span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

