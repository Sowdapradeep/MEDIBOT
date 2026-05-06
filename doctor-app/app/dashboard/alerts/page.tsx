"use client";

import { useState, useEffect } from "react";
import { getAlerts } from "@/lib/api";

interface Alert {
  id: string;
  patient_name: string;
  type: string;
  message: string;
  severity: "critical" | "warning" | "info";
  created_at: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const data = await getAlerts();
        setAlerts(data.alerts || []);
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
        <div className="animate-pulse text-green-700">Loading alerts...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Emergency Alerts</h1>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {alerts.length === 0 ? (
        <p className="text-gray-500">No active alerts.</p>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-lg border p-4 shadow-sm ${
                alert.severity === "critical"
                  ? "border-red-300 bg-red-50"
                  : alert.severity === "warning"
                  ? "border-yellow-300 bg-yellow-50"
                  : "border-blue-300 bg-blue-50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{alert.patient_name}</p>
                  <p className="text-sm font-medium text-gray-700">{alert.type}</p>
                  <p className="mt-1 text-sm text-gray-600">{alert.message}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-bold uppercase ${
                    alert.severity === "critical"
                      ? "bg-red-200 text-red-800"
                      : alert.severity === "warning"
                      ? "bg-yellow-200 text-yellow-800"
                      : "bg-blue-200 text-blue-800"
                  }`}
                >
                  {alert.severity}
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-400">{alert.created_at}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
