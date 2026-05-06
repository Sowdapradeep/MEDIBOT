"use client";

import { useState } from "react";
import { updateNotificationSettings } from "@/lib/api";

interface NotificationSettings {
  sms_enabled: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  appointment_reminders: boolean;
  emergency_alerts: boolean;
  daily_reports: boolean;
  doctor_activity_alerts: boolean;
}

export default function NotificationConfigPage() {
  const [settings, setSettings] = useState<NotificationSettings>({
    sms_enabled: true,
    push_enabled: true,
    email_enabled: true,
    appointment_reminders: true,
    emergency_alerts: true,
    daily_reports: false,
    doctor_activity_alerts: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleToggle(key: keyof NotificationSettings) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSave() {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await updateNotificationSettings(settings);
      setSuccess("Notification settings updated");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update settings";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Notification Settings</h1>

      <div className="space-y-6 rounded-xl bg-white p-6 shadow">
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Channels</h2>
          <div className="space-y-3">
            <ToggleRow
              label="SMS Notifications"
              description="Send notifications via SMS to staff"
              enabled={settings.sms_enabled}
              onToggle={() => handleToggle("sms_enabled")}
            />
            <ToggleRow
              label="Push Notifications"
              description="Browser and app push notifications"
              enabled={settings.push_enabled}
              onToggle={() => handleToggle("push_enabled")}
            />
            <ToggleRow
              label="Email Notifications"
              description="Send email digests and alerts"
              enabled={settings.email_enabled}
              onToggle={() => handleToggle("email_enabled")}
            />
          </div>
        </section>

        <hr className="border-gray-200" />

        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Alert Types</h2>
          <div className="space-y-3">
            <ToggleRow
              label="Appointment Reminders"
              description="Notify before upcoming appointments"
              enabled={settings.appointment_reminders}
              onToggle={() => handleToggle("appointment_reminders")}
            />
            <ToggleRow
              label="Emergency Alerts"
              description="Critical patient emergency notifications"
              enabled={settings.emergency_alerts}
              onToggle={() => handleToggle("emergency_alerts")}
            />
            <ToggleRow
              label="Daily Reports"
              description="End-of-day summary reports"
              enabled={settings.daily_reports}
              onToggle={() => handleToggle("daily_reports")}
            />
            <ToggleRow
              label="Doctor Activity Alerts"
              description="Notify when doctors go inactive"
              enabled={settings.doctor_activity_alerts}
              onToggle={() => handleToggle("doctor_activity_alerts")}
            />
          </div>
        </section>

        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        {success && <p className="text-sm text-green-600" role="status">{success}</p>}

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? "bg-indigo-600" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
