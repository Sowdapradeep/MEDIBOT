"use client";

export const dynamic = "force-dynamic";

import { useState, useRef, useEffect } from "react";
import { submitSymptoms, analyzeSymptomImage } from "@/lib/api";
import Link from "next/link";

type MessageRole = "bot" | "user";
type InputMode = "text" | "voice" | "image";

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  image?: string;
  analysisData?: AnalysisData | null;
  timestamp: Date;
}

interface AnalysisData {
  severity?: string;
  body_system?: string;
  possible_condition_category?: string;
  confidence?: number;
  immediate_flag?: boolean;
  reasoning?: string;
  urgency_hours?: number | null;
  reassurance_message?: string;
  immediate_actions?: string[];
  home_care_instructions?: string[];
  home_care_suggestions?: string[];
  what_to_avoid?: string[];
  warning_signs?: string[];
  otc_suggestions?: string[];
  follow_up_in_hours?: number | null;
  recommended_specialist?: string;
  primary_specialty?: string;
  secondary_specialty?: string | null;
  telemedicine_suitable?: boolean;
  visual_observations?: string[];
  key_symptoms_identified?: string[];
  see_doctor_recommendation?: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "bot",
      content: "Hi! I'm MediBot 🩺\n\nTell me your symptoms using text, voice, or upload a photo of the affected area. I'll analyze and guide you.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function addMessage(role: MessageRole, content: string, image?: string, analysisData?: AnalysisData | null) {
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role, content, image, analysisData, timestamp: new Date() },
    ]);
  }

  // Voice - uses Web Speech API for real-time transcription
  async function toggleRecording() {
    if (recording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      setRecording(false);
    } else {
      // Check if Web Speech API is available
      const SpeechRecognition = (window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

      if (SpeechRecognition) {
        // Use Web Speech API for real-time transcription
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recognition = new (SpeechRecognition as any)();
        recognition.lang = "en-IN";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = async (event: any) => {
          const transcript = event.results[0][0].transcript;
          setRecording(false);

          if (transcript) {
            addMessage("user", `🎤 "${transcript}"`);
            setLoading(true);
            try {
              const res = await submitSymptoms(transcript);
              const data = normalizeResult(res.data);
              const summary = buildSummary(data);
              addMessage("bot", summary, undefined, data);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Analysis failed";
              addMessage("bot", `❌ ${msg}. Please try again.`);
            } finally {
              setLoading(false);
            }
          }
        };

        recognition.onerror = () => {
          setRecording(false);
          addMessage("bot", "❌ Could not hear you clearly. Please try again or type your symptoms.");
        };

        recognition.onend = () => {
          setRecording(false);
        };

        recognition.start();
        setRecording(true);
        addMessage("bot", "🎤 Listening... Speak your symptoms now.");
      } else {
        // Fallback: record audio and send to backend
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const recorder = new MediaRecorder(stream);
          mediaRecorderRef.current = recorder;
          chunksRef.current = [];
          recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
          recorder.onstop = async () => {
            stream.getTracks().forEach((t) => t.stop());
            addMessage("bot", "Voice recording captured. Speech recognition not supported in this browser. Please type your symptoms instead.");
          };
          recorder.start();
          setRecording(true);
          addMessage("bot", "🎤 Recording... Tap again to stop.");
        } catch {
          addMessage("bot", "❌ Microphone access denied. Please type your symptoms instead.");
        }
      }
    }
  }

  // Image
  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    addMessage("user", "📷 Photo uploaded", previewUrl);
    setLoading(true);

    try {
      const res = await analyzeSymptomImage(file);
      const rawData = res.data as Record<string, unknown>;
      // Normalize image analysis to match the same structure as text pipeline
      const homeCare = (rawData.home_care_suggestions || []) as string[];
      const data: AnalysisData = {
        severity: (rawData.severity || "MEDIUM") as string,
        body_system: (rawData.body_system || "") as string,
        possible_condition_category: (rawData.possible_condition_category || "") as string,
        confidence: (rawData.confidence || 0) as number,
        immediate_flag: (rawData.immediate_flag || false) as boolean,
        reasoning: (rawData.reasoning || "") as string,
        urgency_hours: (rawData.urgency_hours || null) as number | null,
        reassurance_message: (rawData.see_doctor_recommendation || "") as string,
        immediate_actions: homeCare.slice(0, 2),
        home_care_instructions: homeCare,
        what_to_avoid: [],
        warning_signs: (rawData.warning_signs || []) as string[],
        otc_suggestions: [],
        follow_up_in_hours: (rawData.urgency_hours || null) as number | null,
        primary_specialty: (rawData.recommended_specialist || "") as string,
        secondary_specialty: null,
        telemedicine_suitable: false,
        key_symptoms_identified: (rawData.visual_observations || []) as string[],
        visual_observations: (rawData.visual_observations || []) as string[],
        see_doctor_recommendation: (rawData.see_doctor_recommendation || "") as string,
      };
      const summary = buildSummary(data);
      addMessage("bot", summary, undefined, data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Analysis failed";
      addMessage("bot", `❌ ${msg}. Please try again or describe your symptoms in text.`);
    } finally {
      setLoading(false);
    }
  }

  // Text submit
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const text = input.trim();
    setInput("");
    addMessage("user", text);
    setLoading(true);

    try {
      const res = await submitSymptoms(text);
      const data = normalizeResult(res.data);
      const summary = buildSummary(data);
      addMessage("bot", summary, undefined, data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Analysis failed";
      addMessage("bot", `❌ ${msg}. Please try again.`);
    } finally {
      setLoading(false);
    }
  }

  function normalizeResult(raw: Record<string, unknown>): AnalysisData {
    const triage = raw.triage as Record<string, unknown> | undefined;
    const decision = raw.decision as Record<string, unknown> | undefined;
    const suggestion = raw.suggestion as Record<string, unknown> | undefined;
    const docRec = raw.doctor_recommendation as Record<string, unknown> | undefined;

    return {
      severity: (decision?.severity || raw.severity || "LOW") as string,
      body_system: (triage?.body_system || raw.body_system || "") as string,
      possible_condition_category: (triage?.possible_condition_category || raw.possible_condition_category || "") as string,
      confidence: (triage?.confidence || raw.confidence || 0) as number,
      immediate_flag: (triage?.immediate_flag || decision?.escalate_to_emergency || false) as boolean,
      reasoning: (decision?.reasoning || triage?.reasoning || raw.reasoning || "") as string,
      urgency_hours: (decision?.urgency_hours || raw.urgency_hours || null) as number | null,
      reassurance_message: (suggestion?.reassurance_message || "") as string,
      immediate_actions: (suggestion?.immediate_actions || []) as string[],
      home_care_instructions: (suggestion?.home_care_instructions || raw.home_care_suggestions || []) as string[],
      what_to_avoid: (suggestion?.what_to_avoid || []) as string[],
      warning_signs: (suggestion?.warning_signs || raw.warning_signs || []) as string[],
      otc_suggestions: (suggestion?.otc_suggestions || []) as string[],
      follow_up_in_hours: (suggestion?.follow_up_in_hours || null) as number | null,
      primary_specialty: (docRec?.primary_specialty || raw.recommended_specialist || "") as string,
      secondary_specialty: (docRec?.secondary_specialty || null) as string | null,
      telemedicine_suitable: (docRec?.telemedicine_suitable || false) as boolean,
      key_symptoms_identified: (triage?.key_symptoms_identified || []) as string[],
      visual_observations: (raw.visual_observations || []) as string[],
      see_doctor_recommendation: (raw.see_doctor_recommendation || "") as string,
    };
  }

  function buildSummary(data: AnalysisData): string {
    const lines: string[] = [];
    if (data.immediate_flag) lines.push("🚨 EMERGENCY — Please call 108 or visit the nearest hospital immediately.");
    if (data.possible_condition_category) lines.push(`Possible condition: ${data.possible_condition_category}`);
    if (data.reassurance_message) lines.push(`\n💚 ${data.reassurance_message}`);
    return lines.join("\n") || "Analysis complete. See details below.";
  }

  const severityColors: Record<string, string> = {
    LOW: "bg-green-100 text-green-800",
    MEDIUM: "bg-yellow-100 text-yellow-800",
    HIGH: "bg-orange-100 text-orange-800",
    CRITICAL: "bg-red-100 text-red-800",
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3 bg-white">
        <Link href="/dashboard" className="text-blue-600 text-lg">←</Link>
        <div>
          <h1 className="font-bold text-gray-900">Symptom Analysis</h1>
          <p className="text-xs text-gray-500">Powered by AI • Not a diagnosis</p>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.role === "user"
                ? "bg-blue-600 text-white rounded-br-md"
                : "bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm"
            }`}>
              {msg.image && (
                <img src={msg.image} alt="Uploaded" className="max-h-40 rounded-lg mb-2" />
              )}
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

              {/* Analysis Card */}
              {msg.analysisData && (
                <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                  {/* Severity */}
                  {msg.analysisData.severity && (
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${severityColors[msg.analysisData.severity] || ""}`}>
                      {msg.analysisData.severity} Severity
                      {msg.analysisData.urgency_hours ? ` • See doctor in ${msg.analysisData.urgency_hours}h` : ""}
                    </span>
                  )}

                  {/* Immediate Actions */}
                  {msg.analysisData.immediate_actions && msg.analysisData.immediate_actions.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">⚡ Do Now:</p>
                      {msg.analysisData.immediate_actions.map((a, i) => (
                        <p key={i} className="text-xs text-gray-700 ml-2">• {a}</p>
                      ))}
                    </div>
                  )}

                  {/* Home Care */}
                  {msg.analysisData.home_care_instructions && msg.analysisData.home_care_instructions.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">🏠 Home Care:</p>
                      {msg.analysisData.home_care_instructions.map((h, i) => (
                        <p key={i} className="text-xs text-gray-700 ml-2">• {h}</p>
                      ))}
                    </div>
                  )}

                  {/* OTC */}
                  {msg.analysisData.otc_suggestions && msg.analysisData.otc_suggestions.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">💊 Medicine:</p>
                      {msg.analysisData.otc_suggestions.map((m, i) => (
                        <p key={i} className="text-xs text-gray-700 ml-2">• {m}</p>
                      ))}
                    </div>
                  )}

                  {/* Warning Signs */}
                  {msg.analysisData.warning_signs && msg.analysisData.warning_signs.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-orange-700 mb-1">⚠️ See doctor if:</p>
                      {msg.analysisData.warning_signs.map((w, i) => (
                        <p key={i} className="text-xs text-orange-700 ml-2">• {w}</p>
                      ))}
                    </div>
                  )}

                  {/* Doctor + Book Button */}
                  {msg.analysisData.primary_specialty && (
                    <div className="space-y-2">
                      <p className="text-xs text-blue-700">
                        👨‍⚕️ Recommended: {msg.analysisData.primary_specialty}
                        {msg.analysisData.telemedicine_suitable ? " (Teleconsult OK)" : ""}
                      </p>
                      <button
                        onClick={() => {
                          const params = new URLSearchParams({
                            specialty: msg.analysisData?.primary_specialty || "",
                            severity: msg.analysisData?.severity || "LOW",
                            urgency: String(msg.analysisData?.urgency_hours || 48),
                          });
                          window.location.href = `/appointments/book?${params.toString()}`;
                        }}
                        className="w-full rounded-lg bg-blue-600 py-2 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        📅 Book Appointment with {msg.analysisData.primary_specialty}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <p className="text-sm text-gray-500 animate-pulse">Analyzing...</p>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Bar */}
      <div className="border-t bg-white px-4 py-3">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          {/* Image button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
            title="Upload photo"
          >
            📷
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageSelect}
            className="hidden"
          />

          {/* Voice button */}
          <button
            type="button"
            onClick={toggleRecording}
            className={`rounded-full p-2 ${recording ? "bg-red-100 text-red-600 animate-pulse" : "text-gray-500 hover:bg-gray-100"}`}
            title={recording ? "Stop recording" : "Voice input"}
          >
            🎤
          </button>

          {/* Text input */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your symptoms..."
            className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
            disabled={loading}
          />

          {/* Send button */}
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="rounded-full bg-blue-600 p-2 text-white disabled:opacity-40"
          >
            ➤
          </button>
        </form>
      </div>
    </div>
  );
}
