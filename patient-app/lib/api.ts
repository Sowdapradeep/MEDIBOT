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

async function fetchWithAuthFormData(
  endpoint: string,
  body: FormData
): Promise<Response> {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response;
}

export async function submitSymptoms(symptoms: string, language?: string) {
  const res = await fetchWithAuth("/patient/symptoms", {
    method: "POST",
    body: JSON.stringify({ symptoms, language }),
  });
  return res.json();
}

export async function getEpisodes() {
  const res = await fetchWithAuth("/patient/episodes");
  return res.json();
}

export async function getEpisode(episodeId: string) {
  const res = await fetchWithAuth(`/patient/episodes/${episodeId}`);
  return res.json();
}

export async function uploadPrescription(file: File, episodeId?: string) {
  const formData = new FormData();
  formData.append("file", file);
  if (episodeId) formData.append("episode_id", episodeId);
  const res = await fetchWithAuthFormData(
    `/patient/prescription/upload?episode_id=${episodeId || ""}`,
    formData
  );
  return res.json();
}

export async function analyzeSymptomImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetchWithAuthFormData("/patient/symptoms/image", formData);
  return res.json();
}

export async function bookAppointment(data: {
  doctor_id: string;
  date: string;
  time_slot: string;
  episode_id?: string;
}) {
  const params = new URLSearchParams({
    doctor_id: data.doctor_id,
    date: data.date,
    time_slot: data.time_slot,
    ...(data.episode_id ? { episode_id: data.episode_id } : {}),
  });
  const res = await fetchWithAuth(`/patient/appointments/book?${params}`, {
    method: "POST",
  });
  return res.json();
}

export async function getAppointments(status?: string) {
  const res = await fetchWithAuth("/patient/appointments");
  return res.json();
}

export async function generateQR(episodeId: string) {
  const res = await fetchWithAuth(`/patient/qr/generate/${episodeId}`);
  return res.json();
}

export async function submitFollowup(data: {
  episode_id: string;
  pain_score: number;
  medicine_taken: boolean;
  new_symptoms?: string;
}) {
  const res = await fetchWithAuth(
    `/patient/followup/checkin?episode_id=${data.episode_id}`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
  return res.json();
}

export async function getTimeline() {
  const res = await fetchWithAuth("/patient/records/timeline");
  return res.json();
}

export async function getProfile() {
  const res = await fetchWithAuth("/patient/profile");
  return res.json();
}

export async function updateProfile(data: Record<string, unknown>) {
  const res = await fetchWithAuth("/patient/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getNearbyDoctors(params?: {
  specialty?: string;
  lat?: number;
  lng?: number;
}) {
  const query = params
    ? `?${new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      ).toString()}`
    : "";
  const res = await fetchWithAuth(`/patient/doctors/nearby${query}`);
  return res.json();
}

export async function transcribeVoice(audioBlob: Blob, language?: string) {
  const formData = new FormData();
  formData.append("file", audioBlob, "recording.wav");
  if (language) formData.append("language", language);
  const res = await fetchWithAuthFormData(
    `/patient/voice/transcribe?language=${language || "english"}`,
    formData
  );
  return res.json();
}
