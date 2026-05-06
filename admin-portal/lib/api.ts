import { getToken } from "./cognito";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

async function getAuthToken(): Promise<string | null> {
  try {
    return await getToken();
  } catch {
    return null;
  }
}

async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response;
}

// Doctor Management
export async function addDoctor(data: object) {
  const res = await fetchWithAuth("/admin/doctors", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getDoctors() {
  const res = await fetchWithAuth("/admin/doctors");
  return res.json();
}

export async function verifyDoctor(doctorId: string) {
  const res = await fetchWithAuth(`/admin/doctors/${doctorId}/verify`, {
    method: "PUT",
  });
  return res.json();
}

export async function deactivateDoctor(doctorId: string) {
  const res = await fetchWithAuth(`/admin/doctors/${doctorId}/deactivate`, {
    method: "PUT",
  });
  return res.json();
}

// Hospital Stats & Dashboard
export async function getHospitalStats() {
  const res = await fetchWithAuth("/admin/hospital/stats");
  return res.json();
}

export async function getHospitalAppointments(status?: string) {
  const query = status ? `?status=${status}` : "";
  const res = await fetchWithAuth(`/admin/hospital/appointments${query}`);
  return res.json();
}

export async function getHospitalAlerts() {
  const res = await fetchWithAuth("/admin/hospital/alerts");
  return res.json();
}

// Settings
export async function updateHospitalProfile(data: object) {
  const res = await fetchWithAuth("/admin/hospital/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateNotificationSettings(settings: object) {
  const res = await fetchWithAuth("/admin/hospital/notifications", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
  return res.json();
}
