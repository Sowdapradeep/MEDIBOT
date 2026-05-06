"use client";

import React, { useState } from "react";

interface PatientRecordViewProps {
  record: {
    summary: string;
    brief: string;
    allergies: string[];
    medications: {
      name: string;
      dosage: string;
      frequency: string;
      status: string;
    }[];
  };
}

type Tab = "brief" | "allergies" | "medications";

export function PatientRecordView({ record }: PatientRecordViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>("brief");

  const tabs: { key: Tab; label: string }[] = [
    { key: "brief", label: "AI Brief" },
    { key: "allergies", label: "Allergies" },
    { key: "medications", label: "Medications" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Summary header */}
      <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800">Patient Summary</h2>
        <p className="text-sm text-gray-600 mt-1">{record.summary}</p>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-gray-100" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {tab.key === "allergies" && record.allergies.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                {record.allergies.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-5" role="tabpanel">
        {activeTab === "brief" && (
          <div className="prose prose-sm max-w-none">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {record.brief}
            </p>
          </div>
        )}

        {activeTab === "allergies" && (
          <div>
            {record.allergies.length > 0 ? (
              <ul className="space-y-2">
                {record.allergies.map((allergy, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg"
                  >
                    <span className="w-2 h-2 bg-red-400 rounded-full flex-shrink-0" />
                    <span className="text-sm text-red-800">{allergy}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">
                No known allergies recorded.
              </p>
            )}
          </div>
        )}

        {activeTab === "medications" && (
          <div className="space-y-3">
            {record.medications.length > 0 ? (
              record.medications.map((med, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{med.name}</p>
                    <p className="text-xs text-gray-500">
                      {med.dosage} · {med.frequency}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                      med.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {med.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">
                No medications on record.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
