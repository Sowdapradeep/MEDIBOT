"use client";

import { useState } from "react";
import { addDoctor } from "@/lib/api";

export default function AddDoctorPage() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    specialty: "",
    qualifications: "",
    languages: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
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
        languages: formData.languages.split(",").map((l) => l.trim()),
        qualifications: formData.qualifications.split(",").map((q) => q.trim()),
      };
      await addDoctor(payload);
      setSuccess("Doctor added successfully");
      setFormData({ name: "", phone: "", specialty: "", qualifications: "", languages: "" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add doctor";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Add New Doctor</h1>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl bg-white p-6 shadow">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            placeholder="Dr. Priya Sharma"
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+91 9876543210"
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label htmlFor="specialty" className="block text-sm font-medium text-gray-700">Specialty</label>
          <select
            id="specialty"
            name="specialty"
            value={formData.specialty}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            required
          >
            <option value="">Select specialty</option>
            <option value="general">General Medicine</option>
            <option value="cardiology">Cardiology</option>
            <option value="dermatology">Dermatology</option>
            <option value="orthopedics">Orthopedics</option>
            <option value="pediatrics">Pediatrics</option>
            <option value="gynecology">Gynecology</option>
            <option value="neurology">Neurology</option>
            <option value="ent">ENT</option>
            <option value="ophthalmology">Ophthalmology</option>
          </select>
        </div>

        <div>
          <label htmlFor="qualifications" className="block text-sm font-medium text-gray-700">
            Qualifications (comma-separated)
          </label>
          <input
            id="qualifications"
            name="qualifications"
            type="text"
            value={formData.qualifications}
            onChange={handleChange}
            placeholder="MBBS, MD, FRCS"
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label htmlFor="languages" className="block text-sm font-medium text-gray-700">
            Languages (comma-separated)
          </label>
          <input
            id="languages"
            name="languages"
            type="text"
            value={formData.languages}
            onChange={handleChange}
            placeholder="English, Tamil, Hindi"
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            required
          />
        </div>

        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        {success && <p className="text-sm text-green-600" role="status">{success}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Adding Doctor..." : "Add Doctor"}
        </button>
      </form>
    </div>
  );
}
