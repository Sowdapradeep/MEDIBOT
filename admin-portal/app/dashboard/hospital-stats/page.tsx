"use client";

import { useState, useEffect } from "react";
import { getHospitalStats } from "@/lib/api";

interface HospitalStats {
  total_doctors: number;
  active_doctors: number;
  total_appointments: number;
  pending_appointments: number;
  completed_appointments: number;
  total_patients: number;
}

export default function HospitalStatsPage() {
  const [stats, setStats] = useState<HospitalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await getHospitalStats();
        setStats(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load stats";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading hospital statistics...</p>
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

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Hospital Statistics</h1>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Doctors" value={stats?.total_doctors ?? 0} color="indigo" />
        <StatCard label="Active Doctors" value={stats?.active_doctors ?? 0} color="green" />
        <StatCard label="Total Appointments" value={stats?.total_appointments ?? 0} color="blue" />
        <StatCard label="Pending Appointments" value={stats?.pending_appointments ?? 0} color="yellow" />
        <StatCard label="Completed Appointments" value={stats?.completed_appointments ?? 0} color="emerald" />
        <StatCard label="Total Patients" value={stats?.total_patients ?? 0} color="purple" />
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-700",
    green: "bg-green-50 text-green-700",
    blue: "bg-blue-50 text-blue-700",
    yellow: "bg-yellow-50 text-yellow-700",
    emerald: "bg-emerald-50 text-emerald-700",
    purple: "bg-purple-50 text-purple-700",
  };

  return (
    <div className={`rounded-xl p-6 ${colorMap[color] || "bg-gray-50 text-gray-700"}`}>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
