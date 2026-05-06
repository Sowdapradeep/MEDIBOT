"use client";

import React from "react";

interface EpisodeCardProps {
  episode: {
    id: string;
    status: "active" | "resolved" | "pending" | "escalated";
    symptoms: string[];
    severity: "low" | "medium" | "high" | "critical";
    date: string;
  };
}

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-blue-50", text: "text-blue-700", label: "Active" },
  resolved: { bg: "bg-green-50", text: "text-green-700", label: "Resolved" },
  pending: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Pending" },
  escalated: { bg: "bg-red-50", text: "text-red-700", label: "Escalated" },
};

const severityStyles: Record<string, { bg: string; text: string }> = {
  low: { bg: "bg-green-100", text: "text-green-800" },
  medium: { bg: "bg-yellow-100", text: "text-yellow-800" },
  high: { bg: "bg-orange-100", text: "text-orange-800" },
  critical: { bg: "bg-red-100", text: "text-red-800" },
};

export function EpisodeCard({ episode }: EpisodeCardProps) {
  const status = statusStyles[episode.status] || statusStyles.active;
  const severity = severityStyles[episode.severity] || severityStyles.low;

  const formattedDate = new Date(episode.date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
          {status.label}
        </span>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${severity.bg} ${severity.text}`}>
          {episode.severity.toUpperCase()}
        </span>
      </div>

      {/* Symptoms */}
      <div className="mb-3">
        <div className="flex flex-wrap gap-1.5">
          {episode.symptoms.slice(0, 3).map((symptom, idx) => (
            <span
              key={idx}
              className="px-2 py-1 bg-gray-50 text-gray-700 text-xs rounded-md"
            >
              {symptom}
            </span>
          ))}
          {episode.symptoms.length > 3 && (
            <span className="px-2 py-1 text-gray-400 text-xs">
              +{episode.symptoms.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
        <span className="text-xs text-gray-400 font-mono">
          {episode.id.slice(0, 8)}...
        </span>
        <span className="text-xs text-gray-500">{formattedDate}</span>
      </div>
    </div>
  );
}
