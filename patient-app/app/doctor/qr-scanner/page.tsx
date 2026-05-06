"use client";

export const dynamic = "force-dynamic";

import { useState, useRef } from "react";
import Link from "next/link";

interface PatientData {
  name: string;
  age: number;
  gender: string;
  blood_group: string;
  allergies: string[];
  chronic_conditions: string[];
  current_episode: {
    diagnosis: string;
    severity: string;
    started: string;
    symptoms: string[];
    ai_brief: string;
  };
  medicines: { name: string; dosage: string; frequency: string; adherence: number }[];
  past_episodes: { diagnosis: string; date: string; outcome: string }[];
  vitals: { pain_score: number; trend: string; days_in_treatment: number };
}

interface ChatMessage {
  id: string;
  role: "bot" | "doctor";
  content: string;
}

// Mock patient data (loaded after QR scan)
const MOCK_PATIENT: PatientData = {
  name: "Arjun Mehta",
  age: 32,
  gender: "Male",
  blood_group: "B+",
  allergies: ["Penicillin"],
  chronic_conditions: [],
  current_episode: {
    diagnosis: "Upper Respiratory Tract Infection with Acid Reflux",
    severity: "MEDIUM",
    started: "2026-05-06",
    symptoms: ["Fever (resolved Day 3)", "Headache (mild)", "Cough (persisting)", "Acid reflux"],
    ai_brief: "32M presenting with 5-day history of URTI. Fever resolved on Day 3 with Amoxicillin. Persistent dry cough likely post-infectious. Acid reflux managed with Pantoprazole. Pain score trending down: 7→6→4→5→3. One missed dose on Day 4 caused brief symptom recurrence. Overall trajectory: improving. Medicine adherence: 90%.",
  },
  medicines: [
    { name: "Amoxicillin 500mg", dosage: "TID", frequency: "After food", adherence: 90 },
    { name: "Paracetamol 650mg", dosage: "BD", frequency: "After food", adherence: 100 },
    { name: "Cetirizine 10mg", dosage: "OD", frequency: "Bedtime", adherence: 100 },
    { name: "Pantoprazole 40mg", dosage: "OD", frequency: "Before food", adherence: 85 },
  ],
  past_episodes: [
    { diagnosis: "Bronchitis with Allergic Rhinitis", date: "2026-04-15", outcome: "Resolved in 7 days" },
    { diagnosis: "Gastritis with GERD", date: "2026-03-20", outcome: "Resolved in 14 days" },
    { diagnosis: "Viral Fever", date: "2026-02-10", outcome: "Self-resolved in 4 days" },
    { diagnosis: "Contact Dermatitis", date: "2025-12-05", outcome: "Resolved — Nickel allergy identified" },
  ],
  vitals: { pain_score: 3, trend: "improving", days_in_treatment: 5 },
};

export default function QRScannerPage() {
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  async function handleScan() {
    setScanning(true);
    // Simulate QR scan delay
    await new Promise((r) => setTimeout(r, 1500));
    setPatient(MOCK_PATIENT);
    setScanned(true);
    setScanning(false);
    setChatMessages([{
      id: "welcome",
      role: "bot",
      content: `Patient record loaded: **${MOCK_PATIENT.name}** (${MOCK_PATIENT.age}y ${MOCK_PATIENT.gender})\n\nCurrent: ${MOCK_PATIENT.current_episode.diagnosis}\n\nAsk me anything about this patient's history, medicines, or condition.`,
    }]);
  }

  async function handleManualScan() {
    if (!manualToken.trim()) return;
    setScanning(true);
    await new Promise((r) => setTimeout(r, 1000));
    setPatient(MOCK_PATIENT);
    setScanned(true);
    setScanning(false);
    setChatMessages([{
      id: "welcome",
      role: "bot",
      content: `✅ QR verified. Patient: **${MOCK_PATIENT.name}**\n\nDiagnosis: ${MOCK_PATIENT.current_episode.diagnosis}\nSeverity: ${MOCK_PATIENT.current_episode.severity}\n\nI can answer questions about their history, medicines, allergies, or recovery progress.`,
    }]);
  }

  // AI Chatbot for patient data queries
  async function handleChatSend(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const question = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { id: `d-${Date.now()}`, role: "doctor", content: question }]);
    setChatLoading(true);

    // Simulate AI response based on question
    await new Promise((r) => setTimeout(r, 1000));

    let answer = "";
    const q = question.toLowerCase();

    if (q.includes("allerg")) {
      answer = `⚠️ **Allergies:** ${patient?.allergies.join(", ") || "None"}\n\nNote: Patient is allergic to Penicillin. Amoxicillin (current) is being used as it's a different class, but monitor for cross-reactivity.`;
    } else if (q.includes("medicine") || q.includes("drug") || q.includes("prescription")) {
      answer = `💊 **Current Medicines:**\n${patient?.medicines.map((m) => `• ${m.name} (${m.dosage}, ${m.frequency}) — Adherence: ${m.adherence}%`).join("\n")}\n\n📊 Overall adherence: 90%. One missed dose on Day 4 caused brief symptom recurrence.`;
    } else if (q.includes("history") || q.includes("past")) {
      answer = `📋 **Past Episodes (last 6 months):**\n${patient?.past_episodes.map((e) => `• ${e.date}: ${e.diagnosis} — ${e.outcome}`).join("\n")}\n\n🔍 Pattern: 2 respiratory episodes in 4 months. Consider environmental triggers or allergy testing.`;
    } else if (q.includes("progress") || q.includes("recover") || q.includes("trend") || q.includes("improving")) {
      answer = `📈 **Recovery Progress:**\n• Day 1: Pain 7/10 (fever 102°F)\n• Day 2: Pain 6/10 (fever reducing)\n• Day 3: Pain 4/10 (fever resolved)\n• Day 4: Pain 5/10 (missed dose, brief relapse)\n• Day 5: Pain 3/10 (back on track)\n\n✅ Overall trend: **Improving**. Antibiotics effective. 2 days remaining in course.`;
    } else if (q.includes("vital") || q.includes("pain") || q.includes("score")) {
      answer = `🩺 **Current Vitals:**\n• Pain score: ${patient?.vitals.pain_score}/10\n• Trend: ${patient?.vitals.trend}\n• Days in treatment: ${patient?.vitals.days_in_treatment}\n• Fever: Resolved (Day 3)\n• Cough: Mild, persisting (post-infectious)`;
    } else if (q.includes("brief") || q.includes("summary") || q.includes("overview")) {
      answer = `🩺 **Clinical Brief:**\n\n${patient?.current_episode.ai_brief}`;
    } else if (q.includes("symptom")) {
      answer = `🔍 **Current Symptoms:**\n${patient?.current_episode.symptoms.map((s) => `• ${s}`).join("\n")}\n\nPrimary complaint was fever + headache. Fever resolved Day 3. Residual dry cough expected to resolve in 2-3 days.`;
    } else if (q.includes("recommend") || q.includes("suggest") || q.includes("next")) {
      answer = `💡 **Recommendations:**\n• Complete remaining 2 days of Amoxicillin\n• If cough persists beyond Day 10, consider chest X-ray\n• Acid reflux: continue Pantoprazole for full 7 days\n• Follow-up in 1 week if not fully resolved\n• Consider allergy testing given 2 respiratory episodes in 4 months`;
    } else {
      answer = `I can help with:\n• **"allergies"** — Patient's known allergies\n• **"medicines"** — Current prescription & adherence\n• **"history"** — Past episodes & patterns\n• **"progress"** — Recovery trend & pain scores\n• **"symptoms"** — Current symptoms\n• **"summary"** — Full clinical brief\n• **"recommendations"** — Suggested next steps`;
    }

    setChatMessages((prev) => [...prev, { id: `b-${Date.now()}`, role: "bot", content: answer }]);
    setChatLoading(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  if (!scanned) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link href="/doctor/dashboard" className="text-sm text-green-600 hover:underline">← Dashboard</Link>
        <h1 className="mt-4 mb-2 text-2xl font-bold text-gray-900">Scan Patient QR</h1>
        <p className="text-sm text-gray-500 mb-6">Scan the patient's one-time QR code to access their health records securely.</p>

        {/* Scanner Options */}
        <div className="mb-4 space-y-3">
          {/* Quick Scan — Demo patient (Arjun) */}
          <button
            onClick={handleScan}
            disabled={scanning}
            className="w-full rounded-xl border-2 border-green-300 bg-green-50 p-6 text-center hover:bg-green-100 transition-colors disabled:opacity-50"
          >
            <div className="mx-auto w-20 h-20 rounded-lg bg-gray-900 flex items-center justify-center mb-3 relative overflow-hidden">
              <div className="absolute inset-2 border-2 border-green-400 rounded" />
              {scanning && <div className="absolute top-2 left-2 right-2 h-0.5 bg-green-400 animate-bounce" />}
              <span className="text-white text-2xl">📷</span>
            </div>
            <p className="font-medium text-green-800">
              {scanning ? "Scanning..." : "Scan Patient QR"}
            </p>
            <p className="text-xs text-green-600 mt-1">Tap to scan Arjun Mehta's QR code</p>
          </button>

          {/* Upload QR Image */}
          <button
            onClick={handleScan}
            className="w-full rounded-lg border border-gray-200 bg-white p-4 text-center hover:bg-gray-50"
          >
            <span className="text-xl">🖼️</span>
            <p className="text-sm font-medium text-gray-700 mt-1">Upload QR Image</p>
            <p className="text-xs text-gray-500">Select a screenshot of patient's QR</p>
          </button>
        </div>

        {/* Manual Token Entry */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Or enter token manually:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="Enter QR token..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              onClick={handleManualScan}
              disabled={scanning}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Verify
            </button>
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-4 rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">🔒 QR codes are one-time use and expire in 60 seconds. Patient data is only accessible after valid scan.</p>
        </div>
      </div>
    );
  }

  // After scan — Patient data + AI Chat
  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto">
      {/* Header */}
      <div className="border-b bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/doctor/dashboard" className="text-green-600">←</Link>
            <div>
              <p className="font-bold text-gray-900">{patient?.name} ({patient?.age}y {patient?.gender})</p>
              <p className="text-xs text-gray-500">{patient?.current_episode.diagnosis}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowChat(!showChat)}
              className={`rounded-lg px-3 py-1 text-xs font-medium ${showChat ? "bg-green-600 text-white" : "bg-green-100 text-green-700"}`}
            >
              🤖 AI Chat
            </button>
            <Link href="/prescriptions/write" className="rounded-lg bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
              📝 Prescribe
            </Link>
          </div>
        </div>
      </div>

      {showChat ? (
        /* AI Chat Interface */
        <div className="flex flex-col flex-1">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "doctor" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === "doctor"
                    ? "bg-green-600 text-white rounded-br-md"
                    : "bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm"
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <p className="text-sm text-gray-500 animate-pulse">Searching patient records...</p>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="border-t bg-white px-4 py-3">
            <form onSubmit={handleChatSend} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about patient history, medicines, allergies..."
                className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm"
              />
              <button type="submit" disabled={chatLoading} className="rounded-full bg-green-600 px-4 py-2 text-white text-sm">
                Ask
              </button>
            </form>
            <div className="flex gap-2 mt-2 overflow-x-auto">
              {["Summary", "Medicines", "Allergies", "Progress", "History", "Recommendations"].map((q) => (
                <button
                  key={q}
                  onClick={() => { setChatInput(q.toLowerCase()); }}
                  className="flex-shrink-0 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Patient Record View */
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
          {/* Alert: Allergy */}
          {patient?.allergies && patient.allergies.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-800">⚠️ Allergies: {patient.allergies.join(", ")}</p>
            </div>
          )}

          {/* AI Clinical Brief */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-1">🤖 AI Clinical Brief</h3>
            <p className="text-xs text-blue-800 leading-relaxed">{patient?.current_episode.ai_brief}</p>
          </div>

          {/* Current Vitals */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border bg-white p-3 text-center">
              <p className="text-lg font-bold text-gray-800">{patient?.vitals.pain_score}/10</p>
              <p className="text-xs text-gray-500">Pain Score</p>
            </div>
            <div className="rounded-lg border bg-white p-3 text-center">
              <p className="text-lg font-bold text-green-600">📈</p>
              <p className="text-xs text-gray-500">{patient?.vitals.trend}</p>
            </div>
            <div className="rounded-lg border bg-white p-3 text-center">
              <p className="text-lg font-bold text-gray-800">Day {patient?.vitals.days_in_treatment}</p>
              <p className="text-xs text-gray-500">Treatment</p>
            </div>
          </div>

          {/* Current Medicines */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">💊 Current Medicines</h3>
            {patient?.medicines.map((med, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm text-gray-800">{med.name}</p>
                  <p className="text-xs text-gray-500">{med.dosage} • {med.frequency}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs ${med.adherence >= 90 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {med.adherence}%
                </span>
              </div>
            ))}
          </div>

          {/* Symptoms */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">🔍 Current Symptoms</h3>
            {patient?.current_episode.symptoms.map((s, i) => (
              <p key={i} className="text-sm text-gray-600">• {s}</p>
            ))}
          </div>

          {/* Past Episodes */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">📋 Past Episodes</h3>
            {patient?.past_episodes.map((ep, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm text-gray-800">{ep.diagnosis}</p>
                  <p className="text-xs text-gray-400">{ep.date}</p>
                </div>
                <span className="text-xs text-green-600">{ep.outcome}</span>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <button onClick={() => setShowChat(true)} className="flex-1 rounded-lg bg-green-600 py-3 text-sm font-medium text-white">
              🤖 Ask AI About Patient
            </button>
            <Link href="/prescriptions/write" className="flex-1 rounded-lg border border-gray-300 py-3 text-center text-sm font-medium text-gray-700">
              📝 Write Prescription
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

