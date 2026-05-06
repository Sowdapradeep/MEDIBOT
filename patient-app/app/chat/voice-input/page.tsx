"use client";

export const dynamic = "force-dynamic";

import { useState, useRef } from "react";
import { transcribeVoice, submitSymptoms } from "@/lib/api";

export default function VoiceInputPage() {
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setRecording(true);
      setError("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Microphone access denied";
      setError(message);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }

  async function processAudio(audioBlob: Blob) {
    setLoading(true);
    try {
      const transcribeResult = await transcribeVoice(audioBlob);
      const text = transcribeResult.transcript || "";
      setTranscript(text);

      if (text) {
        const result = await submitSymptoms(text);
        setResponse(result);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Transcription failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Voice Input</h1>
      <p className="mb-6 text-gray-500">
        Tap the microphone and describe your symptoms in your preferred language.
      </p>

      <div className="flex flex-col items-center space-y-6">
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={loading}
          className={`flex h-24 w-24 items-center justify-center rounded-full text-4xl transition-all ${
            recording
              ? "animate-pulse bg-red-500 text-white"
              : "bg-blue-100 text-blue-600 hover:bg-blue-200"
          } disabled:opacity-50`}
          aria-label={recording ? "Stop recording" : "Start recording"}
        >
          {recording ? "⏹" : "🎤"}
        </button>

        <p className="text-sm text-gray-500">
          {recording
            ? "Recording... Tap to stop"
            : loading
            ? "Processing audio..."
            : "Tap to start recording"}
        </p>
      </div>

      {error && (
        <p className="mt-4 text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {transcript && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-600">Transcript</h2>
          <p className="text-gray-800">{transcript}</p>
        </div>
      )}

      {response && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
          <h2 className="mb-2 font-semibold text-green-800">Assessment</h2>
          <pre className="whitespace-pre-wrap text-sm text-gray-700">
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

