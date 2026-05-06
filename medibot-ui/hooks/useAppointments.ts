"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "../lib/api";

interface Appointment {
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  episode_id?: string;
  date: string;
  time_slot: string;
  reason?: string;
  appointment_type: string;
  status: string;
  notes?: string;
  created_at?: string;
}

interface BookAppointmentParams {
  doctor_id: string;
  date: string;
  time_slot: string;
  episode_id?: string;
  reason?: string;
  appointment_type?: string;
}

interface UseAppointmentsReturn {
  appointments: Appointment[];
  loading: boolean;
  book: (params: BookAppointmentParams) => Promise<Appointment>;
  cancel: (appointmentId: string) => Promise<void>;
}

export function useAppointments(): UseAppointmentsReturn {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth("/appointments");
      if (!response.ok) {
        throw new Error(`Failed to fetch appointments: ${response.status}`);
      }
      const data = await response.json();
      setAppointments(data);
    } catch (err) {
      console.error("Failed to load appointments:", err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const book = useCallback(
    async (params: BookAppointmentParams): Promise<Appointment> => {
      const response = await fetchWithAuth("/appointments", {
        method: "POST",
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Failed to book appointment: ${response.status}`);
      }

      const newAppointment = await response.json();
      setAppointments((prev) => [...prev, newAppointment]);
      return newAppointment;
    },
    []
  );

  const cancel = useCallback(async (appointmentId: string): Promise<void> => {
    const response = await fetchWithAuth(`/appointments/${appointmentId}/cancel`, {
      method: "PUT",
    });

    if (!response.ok) {
      throw new Error(`Failed to cancel appointment: ${response.status}`);
    }

    setAppointments((prev) =>
      prev.map((apt) =>
        apt.appointment_id === appointmentId
          ? { ...apt, status: "cancelled" }
          : apt
      )
    );
  }, []);

  return { appointments, loading, book, cancel };
}
