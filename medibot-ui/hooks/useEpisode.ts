"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "../lib/api";

interface Symptom {
  description: string;
  duration?: string;
  severity?: string;
  body_part?: string;
}

interface Episode {
  episode_id: string;
  patient_id: string;
  symptoms: Symptom[];
  triage_result: Record<string, unknown> | null;
  decision: string | null;
  suggestions: string[] | null;
  doctor_recommendation: Record<string, unknown> | null;
  prescription_text: string | null;
  status: string;
  language: string;
  input_mode: string;
  created_at: string | null;
  updated_at: string | null;
}

interface UseEpisodeReturn {
  episode: Episode | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useEpisode(episodeId: string | null): UseEpisodeReturn {
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEpisode = useCallback(async () => {
    if (!episodeId) {
      setEpisode(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth(`/episodes/${episodeId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch episode: ${response.status}`);
      }
      const data = await response.json();
      setEpisode(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load episode";
      setError(message);
      setEpisode(null);
    } finally {
      setLoading(false);
    }
  }, [episodeId]);

  useEffect(() => {
    fetchEpisode();
  }, [fetchEpisode]);

  const refresh = useCallback(async () => {
    await fetchEpisode();
  }, [fetchEpisode]);

  return { episode, loading, error, refresh };
}
