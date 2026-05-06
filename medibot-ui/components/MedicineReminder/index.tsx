"use client";

import React from "react";

interface MedicineReminderProps {
  medicine: {
    name: string;
    dosage: string;
    time: string;
    taken: boolean;
  };
}

export function MedicineReminder({ medicine }: MedicineReminderProps) {
  const timeOfDay = getTimeOfDay(medicine.time);

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
        medicine.taken
          ? "bg-green-50 border-green-100"
          : "bg-white border-gray-100 shadow-sm"
      }`}
    >
      {/* Status indicator */}
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
          medicine.taken ? "bg-green-100" : "bg-blue-50"
        }`}
        aria-hidden="true"
      >
        {medicine.taken ? (
          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>

      {/* Medicine info */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            medicine.taken ? "text-green-800 line-through" : "text-gray-900"
          }`}
        >
          {medicine.name}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">{medicine.dosage}</p>
      </div>

      {/* Time */}
      <div className="flex-shrink-0 text-right">
        <p className={`text-sm font-medium ${medicine.taken ? "text-green-600" : "text-gray-700"}`}>
          {medicine.time}
        </p>
        <p className="text-xs text-gray-400 capitalize">{timeOfDay}</p>
      </div>
    </div>
  );
}

function getTimeOfDay(time: string): string {
  const hour = parseInt(time.split(":")[0], 10);
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}
