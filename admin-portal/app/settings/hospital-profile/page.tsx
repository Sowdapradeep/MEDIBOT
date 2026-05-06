"use client";

import { useState } from "react";
import { updateHospitalProfile } from "@/lib/api";

export default function HospitalProfilePage() {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    registration_number: "",
    specialties: "",
    operating_hours: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...formData,
        specialties: formData.specialties.split(",").map((s) => s.trim()),
      };
      await updateHospitalProfile(payload);
      setSuccess("Hospital profile updated successfully");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update profile";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Hospital Profile</h1>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl bg-white p-6 shadow">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Hospital Name</label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            placeholder="City General Hospital"
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</label>
          <textarea
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="123 Medical Lane, Chennai, Tamil Nadu"
            rows={2}
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+91 44 12345678"
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="admin@hospital.com"
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700">Website</label>
          <input
            id="website"
            name="website"
            type="url"
            value={formData.website}
            onChange={handleChange}
            placeholder="https://hospital.com"
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="registration_number" className="block text-sm font-medium text-gray-700">Registration Number</label>
          <input
            id="registration_number"
            name="registration_number"
            type="text"
            value={formData.registration_number}
            onChange={handleChange}
            placeholder="REG-2024-001"
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label htmlFor="specialties" className="block text-sm font-medium text-gray-700">Specialties (comma-separated)</label>
          <input
            id="specialties"
            name="specialties"
            type="text"
            value={formData.specialties}
            onChange={handleChange}
            placeholder="Cardiology, Orthopedics, Pediatrics"
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="operating_hours" className="block text-sm font-medium text-gray-700">Operating Hours</label>
          <input
            id="operating_hours"
            name="operating_hours"
            type="text"
            value={formData.operating_hours}
            onChange={handleChange}
            placeholder="Mon-Sat: 8:00 AM - 10:00 PM"
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        {success && <p className="text-sm text-green-600" role="status">{success}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </div>
  );
}
