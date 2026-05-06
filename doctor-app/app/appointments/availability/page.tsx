"use client";

import { useState } from "react";
import { updateAvailability } from "@/lib/api";

interface Slot {
  day: string;
  start_time: string;
  end_time: string;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function AvailabilityPage() {
  const [slots, setSlots] = useState<Slot[]>([
    { day: "Monday", start_time: "09:00", end_time: "17:00" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function addSlot() {
    setSlots([...slots, { day: "Monday", start_time: "09:00", end_time: "17:00" }]);
  }

  function removeSlot(index: number) {
    setSlots(slots.filter((_, i) => i !== index));
  }

  function updateSlot(index: number, field: keyof Slot, value: string) {
    const updated = [...slots];
    updated[index] = { ...updated[index], [field]: value };
    setSlots(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      await updateAvailability(slots);
      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update availability";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Manage Availability</h1>

      {success && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          Availability updated successfully.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {slots.map((slot, index) => (
          <div
            key={index}
            className="flex items-end gap-3 rounded-lg border border-gray-200 bg-white p-4"
          >
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500">Day</label>
              <select
                value={slot.day}
                onChange={(e) => updateSlot(index, "day", e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
              >
                {DAYS.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">Start</label>
              <input
                type="time"
                value={slot.start_time}
                onChange={(e) => updateSlot(index, "start_time", e.target.value)}
                className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">End</label>
              <input
                type="time"
                value={slot.end_time}
                onChange={(e) => updateSlot(index, "end_time", e.target.value)}
                className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => removeSlot(index)}
              className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700 hover:bg-red-200"
            >
              Remove
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addSlot}
          className="w-full rounded-lg border-2 border-dashed border-gray-300 py-2 text-sm font-medium text-gray-500 hover:border-green-500 hover:text-green-700"
        >
          + Add Slot
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-green-700 py-2 font-medium text-white hover:bg-green-800 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Availability"}
        </button>
      </form>
    </div>
  );
}
