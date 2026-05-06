"use client";

import React, { useState, useRef, useCallback } from "react";

interface VoiceInputProps {
  onRecordingComplete: (blob: Blob) => void;
  language: string;
}

export function VoiceInput({ onRecordingComplete, language }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const languageLabels: Record<string, string> = {
    english: "English",
    tamil: "தமிழ்",
    hindi: "हिन्दी",
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        },
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onRecordingComplete(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Language indicator */}
      <span className="text-xs text-gray-500">
        {languageLabels[language] || language}
      </span>

      {/* Record button */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
        className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all ${
          isRecording
            ? "bg-red-500 hover:bg-red-600 scale-110"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {/* Pulse animation when recording */}
        {isRecording && (
          <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30" />
        )}

        {isRecording ? (
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        )}
      </button>

      {/* Duration */}
      {isRecording && (
        <span className="text-sm font-mono text-red-600">
          {formatDuration(duration)}
        </span>
      )}

      {/* Hint text */}
      <p className="text-xs text-gray-400">
        {isRecording ? "Tap to stop" : "Tap to speak"}
      </p>
    </div>
  );
}
