"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const [profile] = useState({
    name: "Arjun Mehta",
    email: "arjun@medibot.in",
    phone: "+91 98765 43210",
    age: 32,
    gender: "Male",
    blood_group: "B+",
    language: "English",
    allergies: ["Penicillin"],
    chronic_conditions: [],
    emergency_contact: "+91 98765 43211 (Wife - Meera)",
    address: "42, Anna Nagar East, Chennai - 600102",
  });

  function handleLogout() {
    localStorage.removeItem("medibot_role");
    router.push("/");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-20">
      <Link href="/patient/dashboard" className="text-sm text-blue-600 hover:underline">← Dashboard</Link>

      <div className="mt-4 text-center mb-6">
        <div className="mx-auto h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-700">
          A
        </div>
        <h1 className="mt-3 text-xl font-bold text-gray-900">{profile.name}</h1>
        <p className="text-sm text-gray-500">{profile.email}</p>
      </div>

      {/* Personal Info */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Personal Information</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Phone</span>
            <span className="text-sm text-gray-800">{profile.phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Age</span>
            <span className="text-sm text-gray-800">{profile.age} years</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Gender</span>
            <span className="text-sm text-gray-800">{profile.gender}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Blood Group</span>
            <span className="text-sm text-gray-800">{profile.blood_group}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Language</span>
            <span className="text-sm text-gray-800">{profile.language}</span>
          </div>
        </div>
      </div>

      {/* Health Info */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Health Information</h3>
        <div className="space-y-2">
          <div>
            <span className="text-sm text-gray-500">Allergies</span>
            <div className="flex gap-1 mt-1">
              {profile.allergies.length > 0 ? profile.allergies.map((a, i) => (
                <span key={i} className="rounded-full bg-red-100 px-3 py-0.5 text-xs text-red-700">{a}</span>
              )) : <span className="text-xs text-gray-400">None reported</span>}
            </div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Chronic Conditions</span>
            <p className="text-sm text-gray-800 mt-0.5">
              {profile.chronic_conditions.length > 0 ? profile.chronic_conditions.join(", ") : "None"}
            </p>
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Emergency Contact</h3>
        <p className="text-sm text-gray-800">{profile.emergency_contact}</p>
      </div>

      {/* Address */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Address</h3>
        <p className="text-sm text-gray-800">{profile.address}</p>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full rounded-lg border border-red-300 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        Logout
      </button>
    </div>
  );
}
