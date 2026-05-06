"use client";

import { useState, useEffect } from "react";
import { getHospitalAlerts } from "@/lib/api";

interface Alert {
  id: string;
  type: string;
  message: string;
  severity: "critical" | "warning" | "info";
  timestamp: string;
  resolved: boolean;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const data = await getHospitalAlerts();
        setAlerts(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load alerts";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    fetchAlerts();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading alerts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-600" role="alert">{error}</p>
      </div>
    );
  }

  const severityStyles: Record<string, string> = {
    critical: "border-red-200 bg-red-50",
    warning: "border-yellow-200 bg-yellow-50",
    info: "border-blue-200 bg-blue-50",
  };

  const severityBadge: Record<string, string> = {
    critical: "bg-red-100 text-red-800",
    warning: "bg-yellow-100 text-yellow-800",
    info: "bg-blue-100 text-blue-800",
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Hospital Alerts</h1>

      <div className="space-y-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`rounded-lg border p-4 ${severityStyles[alert.severity] || "border-gray-200 bg-white"}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${severityBadge[alert.severity] || ""}`}>
                  {alert.severity}
                </span>
                <p className="mt-1 text-sm font-medium text-gray-900">{alert.message}</p>
                <p className="mt-1 text-xs text-gray-500">{alert.type} • {alert.timestamp}</p>
              </div>
              {alert.resolved && (
                <span className="text-xs font-medium text-green-600">Resolved</span>
              )}
            </div>
          </div>
        ))}
        {alerts.length === 0 && (
          <p className="py-8 text-center text-gray-500">No alerts at this time</p>
        )}
      </div>
    </div>
  );
}
