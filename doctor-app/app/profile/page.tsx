"use client";

import { useState, useEffect } from "react";
import { getProfile, updateProfile } from "@/lib/api";

interface DoctorProfile {
  name: string;
  email: string;
  phone: string;
  specialty: string;
  registration_number: string;
  hospital: string;
  experience_years: number;
  languages: string[];
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await getProfile();
        setProfile(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load profile";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      await updateProfile(profile);
      setSuccess(true);
      setEditing(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update profile";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-green-700">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-red-600">{error || "Profile not found"}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Doctor Profile</h1>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
          >
            Edit
          </button>
        )}
      </div>

      {success && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          Profile updated successfully.
        </div>
      )}

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <div>
          <label className="block text-xs font-medium text-gray-500">Name</label>
          {editing ? (
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none"
            />
          ) : (
            <p className="mt-1 text-gray-900">{profile.name}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500">Email</label>
          <p className="mt-1 text-gray-900">{profile.email}</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500">Phone</label>
          {editing ? (
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none"
            />
          ) : (
            <p className="mt-1 text-gray-900">{profile.phone}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500">Specialty</label>
          {editing ? (
            <input
              type="text"
              value={profile.specialty}
              onChange={(e) => setProfile({ ...profile, specialty: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none"
            />
          ) : (
            <p className="mt-1 text-gray-900">{profile.specialty}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500">Registration Number</label>
          <p className="mt-1 text-gray-900">{profile.registration_number}</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500">Hospital</label>
          {editing ? (
            <input
              type="text"
              value={profile.hospital}
              onChange={(e) => setProfile({ ...profile, hospital: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none"
            />
          ) : (
            <p className="mt-1 text-gray-900">{profile.hospital}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500">Experience</label>
          {editing ? (
            <input
              type="number"
              value={profile.experience_years}
              onChange={(e) =>
                setProfile({ ...profile, experience_years: parseInt(e.target.value) || 0 })
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none"
            />
          ) : (
            <p className="mt-1 text-gray-900">{profile.experience_years} years</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500">Languages</label>
          <p className="mt-1 text-gray-900">{profile.languages.join(", ")}</p>
        </div>

        {editing && (
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-lg bg-green-700 py-2 font-medium text-white hover:bg-green-800 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg bg-gray-200 px-4 py-2 font-medium text-gray-700 hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
