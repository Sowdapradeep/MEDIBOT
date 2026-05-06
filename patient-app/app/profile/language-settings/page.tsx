"use client";

import { useEffect, useState } from "react";
import { getProfile, updateProfile } from "@/lib/api";

const LANGUAGES = [
  { code: "english", label: "English", native: "English" },
  { code: "tamil", label: "Tamil", native: "தமிழ்" },
  { code: "hindi", label: "Hindi", native: "हिन्दी" },
];

export default function LanguageSettingsPage() {
  const [language, setLanguage] = useState("english");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await getProfile();
        setLanguage(data.language || "english");
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave(selectedLang: string) {
    setLanguage(selectedLang);
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      await updateProfile({ language: selectedLang });
      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Language Preference</h1>
      <p className="mb-6 text-gray-500">
        Choose your preferred language for MediBot interactions. The AI will respond in your selected language.
      </p>

      <div className="space-y-3">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleSave(lang.code)}
            disabled={saving}
            className={`flex w-full items-center justify-between rounded-lg border p-4 transition-colors ${
              language === lang.code
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            } disabled:opacity-50`}
            aria-pressed={language === lang.code}
          >
            <div className="text-left">
              <p className="font-medium text-gray-800">{lang.label}</p>
              <p className="text-sm text-gray-500">{lang.native}</p>
            </div>
            {language === lang.code && (
              <span className="text-blue-600">✓</span>
            )}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}
      {success && <p className="mt-4 text-sm text-green-600">Language preference saved!</p>}
    </div>
  );
}
