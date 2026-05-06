"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";

type TimeFilter = "all" | "past" | "present" | "future";

interface HealthRecord {
  id: string;
  type: "episode" | "appointment" | "prescription" | "followup" | "lab_report";
  status: "past" | "present" | "future";
  date: string;
  title: string;
  subtitle: string;
  severity?: string;
  body_system?: string;
  doctor?: string;
  hospital?: string;
  outcome?: string;
  details?: string[];
  medicines?: string[];
}

// Comprehensive mock data covering past, present, and future
const ALL_RECORDS: HealthRecord[] = [
  // FUTURE
  {
    id: "f-001",
    type: "appointment",
    status: "future",
    date: "2026-05-13",
    title: "Follow-up Visit",
    subtitle: "Dr. Priya Sharma — General Physician",
    hospital: "Apollo Clinic, Anna Nagar",
    details: ["Review recovery from respiratory infection", "Check if antibiotics course completed", "Possible discharge from monitoring"],
  },
  {
    id: "f-002",
    type: "followup",
    status: "future",
    date: "2026-05-11",
    title: "Daily Check-in Due",
    subtitle: "Day 6 of treatment — Upper Respiratory Infection",
    details: ["Report pain score", "Confirm medicine adherence", "Upload photo if rash persists"],
  },
  {
    id: "f-003",
    type: "lab_report",
    status: "future",
    date: "2026-05-12",
    title: "Blood Test Scheduled",
    subtitle: "CBC + ESR — to confirm infection clearing",
    hospital: "SRL Diagnostics, T. Nagar",
    details: ["Fasting required (8 hours)", "Carry previous reports", "Results in 24 hours"],
  },

  // PRESENT (Active)
  {
    id: "p-001",
    type: "episode",
    status: "present",
    date: "2026-05-06",
    title: "Upper Respiratory Tract Infection",
    subtitle: "Active — Day 5 of 7 treatment",
    severity: "MEDIUM",
    body_system: "respiratory",
    doctor: "Dr. Priya Sharma",
    outcome: "Improving — Pain reduced from 7/10 to 3/10",
    medicines: ["Amoxicillin 500mg", "Paracetamol 650mg", "Cetirizine 10mg", "Pantoprazole 40mg"],
    details: ["Fever resolved on Day 3", "Mild cough persisting", "Antibiotics course: 2 days remaining"],
  },
  {
    id: "p-002",
    type: "prescription",
    status: "present",
    date: "2026-05-06",
    title: "Active Prescription",
    subtitle: "4 medicines — 2 days remaining",
    doctor: "Dr. Priya Sharma",
    medicines: ["Amoxicillin 500mg (TID)", "Paracetamol 650mg (BD)", "Cetirizine 10mg (OD)", "Pantoprazole 40mg (OD)"],
    details: ["Adherence: 90%", "1 missed dose on Day 4", "Next reminder: 08:00 PM today"],
  },

  // PAST
  {
    id: "h-001",
    type: "episode",
    status: "past",
    date: "2026-04-15",
    title: "Bronchitis with Allergic Rhinitis",
    subtitle: "Resolved in 7 days",
    severity: "LOW",
    body_system: "respiratory",
    doctor: "Dr. Ravi Kumar",
    hospital: "Kauvery Hospital",
    outcome: "✅ Fully recovered",
    medicines: ["Azithromycin 500mg", "Montelukast 10mg"],
    details: ["Severe cough for 5 days", "Treated with antibiotics + antihistamine", "No recurrence"],
  },
  {
    id: "h-002",
    type: "episode",
    status: "past",
    date: "2026-03-20",
    title: "Gastritis with GERD",
    subtitle: "Resolved in 14 days",
    severity: "MEDIUM",
    body_system: "gastrointestinal",
    doctor: "Dr. Fathima Begum",
    hospital: "MGM Healthcare",
    outcome: "✅ Resolved — Diet modification advised",
    medicines: ["Omeprazole 20mg", "Domperidone 10mg"],
    details: ["Severe acidity and burning", "Triggered by spicy food", "Lifestyle changes recommended", "Avoid late-night eating"],
  },
  {
    id: "h-003",
    type: "episode",
    status: "past",
    date: "2026-02-10",
    title: "Viral Fever",
    subtitle: "Resolved in 4 days",
    severity: "LOW",
    body_system: "general",
    doctor: "Dr. Priya Sharma",
    hospital: "Apollo Clinic",
    outcome: "✅ Self-resolved with rest",
    medicines: ["Paracetamol 500mg", "ORS"],
    details: ["Mild fever 100°F", "Body ache", "No antibiotics needed", "Home care sufficient"],
  },
  {
    id: "h-004",
    type: "episode",
    status: "past",
    date: "2025-12-05",
    title: "Skin Allergy (Contact Dermatitis)",
    subtitle: "Resolved in 10 days",
    severity: "LOW",
    body_system: "dermatological",
    doctor: "Dr. Anitha Raj",
    hospital: "Skin & Hair Clinic, T. Nagar",
    outcome: "✅ Resolved — Allergen identified (nickel)",
    medicines: ["Betamethasone cream", "Cetirizine 10mg"],
    details: ["Rash on wrists from watch strap", "Patch test done", "Avoid nickel jewelry"],
  },
  {
    id: "h-005",
    type: "appointment",
    status: "past",
    date: "2025-11-15",
    title: "Annual Health Checkup",
    subtitle: "Routine — All normal",
    doctor: "Dr. Priya Sharma",
    hospital: "Apollo Clinic",
    outcome: "✅ All parameters normal",
    details: ["BP: 120/80", "Sugar: 95 mg/dL (fasting)", "Cholesterol: 180", "BMI: 23.5", "No concerns"],
  },
  {
    id: "h-006",
    type: "episode",
    status: "past",
    date: "2025-09-20",
    title: "Lower Back Pain",
    subtitle: "Resolved in 2 weeks",
    severity: "MEDIUM",
    body_system: "musculoskeletal",
    doctor: "Dr. Karthik Venkatesh",
    hospital: "SIMS Hospital",
    outcome: "✅ Resolved with physiotherapy",
    medicines: ["Diclofenac gel", "Thiocolchicoside 4mg"],
    details: ["Caused by prolonged sitting", "3 physiotherapy sessions", "Posture correction advised", "Ergonomic chair recommended"],
  },
];

export default function TimelinePage() {
  const [filter, setFilter] = useState<TimeFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = filter === "all" ? ALL_RECORDS : ALL_RECORDS.filter((r) => r.status === filter);

  const counts = {
    all: ALL_RECORDS.length,
    future: ALL_RECORDS.filter((r) => r.status === "future").length,
    present: ALL_RECORDS.filter((r) => r.status === "present").length,
    past: ALL_RECORDS.filter((r) => r.status === "past").length,
  };

  const severityColors: Record<string, string> = {
    LOW: "bg-green-100 text-green-700",
    MEDIUM: "bg-yellow-100 text-yellow-700",
    HIGH: "bg-orange-100 text-orange-700",
    CRITICAL: "bg-red-100 text-red-700",
  };

  const statusColors: Record<string, string> = {
    past: "border-gray-200",
    present: "border-blue-300 bg-blue-50/30",
    future: "border-purple-200 bg-purple-50/30",
  };

  const typeIcons: Record<string, string> = {
    episode: "🩺",
    appointment: "📅",
    prescription: "💊",
    followup: "📋",
    lab_report: "🧪",
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-20">
      <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">← Dashboard</Link>
      <h1 className="mt-4 mb-2 text-2xl font-bold text-gray-900">Health Records</h1>
      <p className="text-sm text-gray-500 mb-4">Complete history of your illness, treatments, and upcoming care.</p>

      {/* Filter Tabs */}
      <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1 mb-5">
        {(["all", "future", "present", "past"] as TimeFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 rounded-md py-2 text-xs font-medium capitalize ${
              filter === f ? "bg-white text-blue-700 shadow-sm" : "text-gray-500"
            }`}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-center">
          <p className="text-lg font-bold text-purple-700">{counts.future}</p>
          <p className="text-xs text-purple-600">Upcoming</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center">
          <p className="text-lg font-bold text-blue-700">{counts.present}</p>
          <p className="text-xs text-blue-600">Active</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
          <p className="text-lg font-bold text-gray-700">{counts.past}</p>
          <p className="text-xs text-gray-600">Past</p>
        </div>
      </div>

      {/* Records List */}
      <div className="space-y-3">
        {filtered.map((record) => (
          <div
            key={record.id}
            className={`rounded-lg border p-4 cursor-pointer transition-all ${statusColors[record.status]}`}
            onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
          >
            {/* Header */}
            <div className="flex items-start gap-3">
              <span className="text-xl">{typeIcons[record.type]}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900 text-sm">{record.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    record.status === "future" ? "bg-purple-100 text-purple-700" :
                    record.status === "present" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {record.status === "present" ? "Active" : record.date}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{record.subtitle}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {record.severity && (
                    <span className={`rounded px-1.5 py-0.5 text-xs ${severityColors[record.severity]}`}>
                      {record.severity}
                    </span>
                  )}
                  {record.body_system && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 capitalize">
                      {record.body_system}
                    </span>
                  )}
                  {record.doctor && (
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600">
                      {record.doctor}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedId === record.id && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                {record.hospital && (
                  <p className="text-xs text-gray-600">🏥 {record.hospital}</p>
                )}
                {record.outcome && (
                  <p className="text-xs font-medium text-gray-700">{record.outcome}</p>
                )}
                {record.medicines && record.medicines.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Medicines:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {record.medicines.map((m, i) => (
                        <span key={i} className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-700">{m}</span>
                      ))}
                    </div>
                  </div>
                )}
                {record.details && record.details.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Details:</p>
                    <ul className="mt-1 space-y-0.5">
                      {record.details.map((d, i) => (
                        <li key={i} className="text-xs text-gray-600">• {d}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

