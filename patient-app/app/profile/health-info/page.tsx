"use client";

import { useEffect, useState } from "react";
import { getProfile, updateProfile } from "@/lib/api";

export default function HealthInfoPage() {
  const [conditions, setConditions] = useState("");
  const [allergies, setAllergies] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await getProfile();
        setConditions((data.known_conditions || []).join(", "));
        setAllergies((data.allergies || []).join(", "));
        setBloodGroup(data.blood_group || "");
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      await updateProfile({
        known_conditions: conditions.split(",").map((c) => c.trim()).filter(Boolean),
        allergies: allergies.split(",").map((a) => a.trim()).filter(Boolean),
        blood_group: bloodGroup,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading health info...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Health Information</h1>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label htmlFor="conditions" className="block text-sm font-medium text-gray-700">
            Known Conditions (comma-separated)
          </label>
          <input
            id="conditions"
            type="text"
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            placeholder="Diabetes, Hypertension, Asthma"
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="allergies" className="block text-sm font-medium text-gray-700">
            Allergies (comma-separated)
          </label>
          <input
            id="allergies"
            type="text"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            placeholder="Penicillin, Peanuts"
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="blood-group" className="block text-sm font-medium text-gray-700">
            Blood Group
          </label>
          <select
            id="blood-group"
            value={bloodGroup}
            onChange={(e) => setBloodGroup(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
          >
            <option value="">Select</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        {success && <p className="text-sm text-green-600">Saved successfully!</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Health Info"}
        </button>
      </form>
    </div>
  );
}
