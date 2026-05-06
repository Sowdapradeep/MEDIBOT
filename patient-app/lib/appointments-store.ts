/**
 * Shared appointment store using localStorage.
 * Both patient and doctor portals read/write from the same store.
 * This simulates a real database connection between the two portals.
 */

export interface SharedAppointment {
  id: string;
  patient_name: string;
  patient_email: string;
  patient_age: number;
  patient_gender: string;
  doctor_id: string;
  doctor_name: string;
  doctor_email: string;
  specialty: string;
  hospital: string;
  date: string;
  time_slot: string;
  reason: string;
  severity: string;
  status: "pending" | "accepted" | "completed" | "cancelled";
  episode_summary?: string;
  booked_at: string;
}

const STORE_KEY = "medibot_appointments";

export function getAppointmentsFromStore(): SharedAppointment[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORE_KEY);
  if (!data) {
    // Initialize with some demo data
    const initial: SharedAppointment[] = [
      {
        id: "apt-demo-001",
        patient_name: "Arjun Mehta",
        patient_email: "arjun@medibot.in",
        patient_age: 32,
        patient_gender: "Male",
        doctor_id: "doc-001",
        doctor_name: "Dr. Priya Sharma",
        doctor_email: "priya@medibot.in",
        specialty: "General Physician",
        hospital: "Apollo Clinic, Anna Nagar",
        date: "2026-05-07",
        time_slot: "10:30 AM",
        reason: "Fever & headache since 3 days",
        severity: "MEDIUM",
        status: "pending",
        episode_summary: "Upper respiratory infection — AI triage confidence 90%",
        booked_at: new Date().toISOString(),
      },
    ];
    localStorage.setItem(STORE_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(data);
}

export function addAppointmentToStore(appointment: SharedAppointment): void {
  const current = getAppointmentsFromStore();
  current.push(appointment);
  localStorage.setItem(STORE_KEY, JSON.stringify(current));
}

export function updateAppointmentStatus(id: string, status: SharedAppointment["status"]): void {
  const current = getAppointmentsFromStore();
  const updated = current.map((a) => (a.id === id ? { ...a, status } : a));
  localStorage.setItem(STORE_KEY, JSON.stringify(updated));
}

export function getAppointmentsForDoctor(doctorEmail: string): SharedAppointment[] {
  return getAppointmentsFromStore().filter((a) => a.doctor_email === doctorEmail);
}

export function getAppointmentsForPatient(patientEmail: string): SharedAppointment[] {
  return getAppointmentsFromStore().filter((a) => a.patient_email === patientEmail);
}
