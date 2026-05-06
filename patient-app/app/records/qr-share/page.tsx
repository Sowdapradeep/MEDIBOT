"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface QRData {
  token: string;
  expiresIn: number;
  createdAt: Date;
  used: boolean;
}

export default function QRSharePage() {
  const [qrToken, setQrToken] = useState<QRData | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState<{ token: string; time: string; status: string }[]>([
    { token: "qr-abc123", time: "10:15 AM today", status: "Used by Dr. Priya Sharma" },
    { token: "qr-def456", time: "Yesterday 3:30 PM", status: "Expired (unused)" },
  ]);

  // Generate a new one-time QR token
  const generateQR = useCallback(async () => {
    setGenerating(true);
    
    // Simulate API call (in production: calls /api/v1/patient/qr/generate/{episode_id})
    await new Promise((r) => setTimeout(r, 800));
    
    const token = `medibot-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const newQR: QRData = {
      token,
      expiresIn: 60,
      createdAt: new Date(),
      used: false,
    };
    
    setQrToken(newQR);
    setTimeLeft(60);
    setGenerating(false);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!qrToken || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // QR expired — add to history and clear
          setHistory((h) => [
            { token: qrToken.token.slice(-8), time: new Date().toLocaleTimeString(), status: "Expired (unused)" },
            ...h,
          ]);
          setQrToken(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [qrToken, timeLeft]);

  // Generate QR code SVG (simple visual representation)
  function renderQRCode(token: string) {
    // Create a deterministic pattern from token
    const size = 200;
    const modules = 21;
    const cellSize = size / modules;
    const cells: boolean[][] = [];
    
    for (let i = 0; i < modules; i++) {
      cells[i] = [];
      for (let j = 0; j < modules; j++) {
        // Position detection patterns (corners)
        if ((i < 7 && j < 7) || (i < 7 && j >= modules - 7) || (i >= modules - 7 && j < 7)) {
          const isOuter = i === 0 || i === 6 || j === 0 || j === 6 || 
                         (i >= modules - 7 && (i === modules - 7 || i === modules - 1)) ||
                         (j >= modules - 7 && (j === modules - 7 || j === modules - 1));
          const isInner = (i >= 2 && i <= 4 && j >= 2 && j <= 4) ||
                         (i >= 2 && i <= 4 && j >= modules - 5 && j <= modules - 3) ||
                         (i >= modules - 5 && i <= modules - 3 && j >= 2 && j <= 4);
          cells[i][j] = isOuter || isInner;
        } else {
          // Data area — pseudo-random based on token
          const charCode = token.charCodeAt((i * modules + j) % token.length);
          cells[i][j] = (charCode + i + j) % 3 === 0;
        }
      }
    }

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
        <rect width={size} height={size} fill="white" />
        {cells.map((row, i) =>
          row.map((cell, j) =>
            cell ? (
              <rect
                key={`${i}-${j}`}
                x={j * cellSize}
                y={i * cellSize}
                width={cellSize}
                height={cellSize}
                fill="black"
              />
            ) : null
          )
        )}
      </svg>
    );
  }

  const progressPercent = qrToken ? (timeLeft / 60) * 100 : 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-20">
      <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">← Dashboard</Link>
      <h1 className="mt-4 mb-2 text-2xl font-bold text-gray-900">QR Health Share</h1>
      <p className="text-sm text-gray-500 mb-6">
        Share your health records securely with your doctor. Each QR is <strong>one-time use</strong> and expires in 60 seconds.
      </p>

      {/* Security Info */}
      <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 p-3">
        <div className="flex items-start gap-2">
          <span className="text-lg">🔒</span>
          <div>
            <p className="text-sm font-medium text-blue-900">Secure One-Time Access</p>
            <ul className="mt-1 text-xs text-blue-700 space-y-0.5">
              <li>• QR expires in 60 seconds — generate a new one anytime</li>
              <li>• Single use only — once scanned, it cannot be reused</li>
              <li>• Doctor sees only your current episode & relevant history</li>
              <li>• You control what gets shared</li>
            </ul>
          </div>
        </div>
      </div>

      {/* QR Display */}
      {qrToken && timeLeft > 0 ? (
        <div className="mb-6 rounded-xl border-2 border-gray-200 bg-white p-6 text-center shadow-sm">
          {/* Timer Ring */}
          <div className="relative inline-block mb-4">
            {renderQRCode(qrToken.token)}
            
            {/* Expiry overlay if < 15 seconds */}
            {timeLeft <= 15 && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded">
                <p className="text-red-600 font-bold text-lg animate-pulse">Expiring...</p>
              </div>
            )}
          </div>

          {/* Timer Bar */}
          <div className="w-full h-2 rounded-full bg-gray-200 mb-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                timeLeft > 30 ? "bg-green-500" : timeLeft > 15 ? "bg-yellow-500" : "bg-red-500"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <p className={`text-lg font-bold ${timeLeft > 15 ? "text-gray-800" : "text-red-600"}`}>
            {timeLeft}s remaining
          </p>
          <p className="text-xs text-gray-500 mt-1">Show this to your doctor to scan</p>

          {/* What's shared */}
          <div className="mt-4 rounded-lg bg-gray-50 p-3 text-left">
            <p className="text-xs font-medium text-gray-600 mb-1">📋 Data shared with doctor:</p>
            <ul className="text-xs text-gray-500 space-y-0.5">
              <li>• Current episode: Upper Respiratory Infection</li>
              <li>• Active medicines & adherence</li>
              <li>• Allergies & known conditions</li>
              <li>• Recent vitals & pain scores</li>
            </ul>
          </div>

          {/* Regenerate */}
          <button
            onClick={generateQR}
            className="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            🔄 Generate New QR
          </button>
        </div>
      ) : (
        /* Generate Button */
        <div className="mb-6 rounded-xl border-2 border-dashed border-gray-300 bg-white p-8 text-center">
          <span className="text-5xl">🔐</span>
          <p className="mt-3 text-gray-600 font-medium">Ready to share your records?</p>
          <p className="text-sm text-gray-400 mt-1">Generate a secure one-time QR for your doctor</p>
          
          <button
            onClick={generateQR}
            disabled={generating}
            className="mt-5 rounded-lg bg-blue-600 px-8 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50 shadow-sm"
          >
            {generating ? "Generating..." : "🔑 Generate Secure QR"}
          </button>
        </div>
      )}

      {/* QR History */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Recent QR Activity</h3>
        <div className="space-y-2">
          {history.map((item, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
              <div>
                <p className="text-sm text-gray-700">QR ...{item.token.slice(-6)}</p>
                <p className="text-xs text-gray-400">{item.time}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs ${
                item.status.includes("Used") ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
              }`}>
                {item.status.includes("Used") ? "✓ Used" : "Expired"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">How it works</h3>
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">1</span>
            <p className="text-xs text-gray-600">Tap "Generate Secure QR" — a unique code is created</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">2</span>
            <p className="text-xs text-gray-600">Show the QR to your doctor — they scan it with their app</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">3</span>
            <p className="text-xs text-gray-600">Doctor sees your health summary — QR becomes invalid immediately</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">4</span>
            <p className="text-xs text-gray-600">If not scanned within 60 seconds, it expires automatically</p>
          </div>
        </div>
      </div>
    </div>
  );
}

