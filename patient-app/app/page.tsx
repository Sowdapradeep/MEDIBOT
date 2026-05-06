"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Demo credentials
const DEMO_USERS = {
  patient: { email: "arjun@medibot.in", password: "patient123" },
  doctor: { email: "priya@medibot.in", password: "doctor123" },
};

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"patient" | "doctor" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;

    const creds = DEMO_USERS[role];
    if (email === creds.email && password === creds.password) {
      localStorage.setItem("medibot_role", role);
      if (role === "patient") {
        router.push("/patient/dashboard");
      } else {
        router.push("/doctor/dashboard");
      }
    } else {
      setError("Invalid email or password");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-5xl">🩺</span>
          <h1 className="mt-3 text-3xl font-bold text-gray-900">MediBot</h1>
          <p className="text-sm text-gray-500 mt-1">AI-Powered Healthcare Assistant</p>
        </div>

        {/* Role Selection */}
        <p className="text-sm font-medium text-gray-700 mb-3 text-center">Login as:</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => { setRole("patient"); setEmail(""); setPassword(""); setError(""); }}
            className={`rounded-xl border-2 p-5 text-center transition-all ${
              role === "patient"
                ? "border-blue-500 bg-blue-50 shadow-sm"
                : "border-gray-200 hover:border-blue-300"
            }`}
          >
            <span className="text-3xl">🧑‍🦱</span>
            <p className="mt-2 font-semibold text-gray-800">Patient</p>
            <p className="text-xs text-gray-500">Get health guidance</p>
          </button>
          <button
            onClick={() => { setRole("doctor"); setEmail(""); setPassword(""); setError(""); }}
            className={`rounded-xl border-2 p-5 text-center transition-all ${
              role === "doctor"
                ? "border-green-500 bg-green-50 shadow-sm"
                : "border-gray-200 hover:border-green-300"
            }`}
          >
            <span className="text-3xl">👩‍⚕️</span>
            <p className="mt-2 font-semibold text-gray-800">Doctor</p>
            <p className="text-xs text-gray-500">Manage patients</p>
          </button>
        </div>

        {/* Login Form */}
        {role && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm text-gray-600">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder={DEMO_USERS[role].email}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="Enter password"
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              className={`w-full rounded-lg py-3 font-medium text-white shadow-sm ${
                role === "patient"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              Login
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-gray-400">
          Secure • HIPAA Compliant • Data encrypted
        </p>
      </div>
    </div>
  );
}
