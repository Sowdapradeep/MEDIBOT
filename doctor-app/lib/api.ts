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

export async function scanQR(token: string) {
  const res = await fetchWithAuth("/doctor/qr/scan", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  return res.json();
}

export async function getPatientRecord(episodeId: string) {
  const res = await fetchWithAuth(`/doctor/patients/episodes/${episodeId}`);
  return res.json();
}

export async function addNotes(episodeId: string, notes: object) {
  const res = await fetchWithAuth(`/doctor/episodes/${episodeId}/notes`, {
    method: "POST",
    body: JSON.stringify(notes),
  });
  return res.json();
}

export async function getAppointments(status?: string) {
  const query = status ? `?status=${status}` : "";
  const res = await fetchWithAuth(`/doctor/appointments${query}`);
  return res.json();
}

export async function updateAvailability(slots: object[]) {
  const res = await fetchWithAuth("/doctor/availability", {
    method: "PUT",
    body: JSON.stringify({ slots }),
  });
  return res.json();
}

export async function createPrescription(medicines: object[]) {
  const res = await fetchWithAuth("/doctor/prescriptions", {
    method: "POST",
    body: JSON.stringify({ medicines }),
  });
  return res.json();
}

export async function getAlerts() {
  const res = await fetchWithAuth("/doctor/alerts");
  return res.json();
}

export async function getProfile() {
  const res = await fetchWithAuth("/doctor/profile");
  return res.json();
}

export async function updateProfile(data: object) {
  const res = await fetchWithAuth("/doctor/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return res.json();
}
