"use client";

import React, { useEffect, useState } from "react";

interface QRDisplayProps {
  url: string;
  episodeId: string;
  expiresIn: number; // seconds
}

export function QRDisplay({ url, episodeId, expiresIn }: QRDisplayProps) {
  const [timeLeft, setTimeLeft] = useState(expiresIn);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      setIsExpired(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercent = (timeLeft / expiresIn) * 100;

  return (
    <div className="flex flex-col items-center p-6 bg-white rounded-2xl shadow-md border border-gray-100">
      {/* QR Code Image */}
      <div
        className={`relative p-4 bg-white rounded-xl border-2 ${
          isExpired ? "border-red-200 opacity-50" : "border-blue-100"
        }`}
      >
        <img
          src={url}
          alt={`QR code for episode ${episodeId}`}
          className="w-48 h-48 object-contain"
        />
        {isExpired && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
            <span className="text-red-600 font-semibold text-sm">Expired</span>
          </div>
        )}
      </div>

      {/* Episode ID */}
      <p className="mt-3 text-xs text-gray-500 font-mono">
        Episode: {episodeId}
      </p>

      {/* Timer */}
      {!isExpired ? (
        <div className="mt-4 w-full max-w-[200px]">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Expires in</span>
            <span className="font-mono">{formatTime(timeLeft)}</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                progressPercent > 30 ? "bg-blue-500" : "bg-orange-500"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-red-600">
          QR code has expired. Please generate a new one.
        </p>
      )}

      {/* Instructions */}
      <p className="mt-4 text-xs text-gray-400 text-center max-w-[220px]">
        Show this QR code to your doctor for secure access to your episode
        records.
      </p>
    </div>
  );
}
