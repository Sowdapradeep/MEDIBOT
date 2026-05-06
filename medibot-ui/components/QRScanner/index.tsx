"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

interface QRScannerProps {
  onScan: (token: string) => void;
  onError: (error: string) => void;
}

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setHasPermission(true);
        setIsScanning(true);
      }
    } catch (err) {
      setHasPermission(false);
      onError(
        err instanceof Error ? err.message : "Camera access denied"
      );
    }
  }, [onError]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  useEffect(() => {
    if (!isScanning) return;

    const interval = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const qrToken = decodeQR(imageData);
      if (qrToken) {
        stopCamera();
        onScan(qrToken);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isScanning, onScan, stopCamera]);

  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div className="relative aspect-square overflow-hidden rounded-2xl border-2 border-blue-200 bg-gray-900">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          aria-label="QR code scanner camera feed"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Scanning overlay */}
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-white rounded-lg opacity-70" />
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <span className="text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                Point camera at QR code
              </span>
            </div>
          </div>
        )}

        {/* Permission denied state */}
        {hasPermission === false && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center p-4">
              <p className="text-white text-sm mb-3">Camera access required</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                Grant Access
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Status indicator */}
      <div className="mt-3 flex items-center justify-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            isScanning ? "bg-green-500 animate-pulse" : "bg-gray-400"
          }`}
        />
        <span className="text-sm text-gray-600">
          {isScanning ? "Scanning..." : "Camera inactive"}
        </span>
      </div>
    </div>
  );
}

/**
 * Basic QR decode placeholder.
 * In production, integrate a library like jsQR or @aspect/qr.
 */
function decodeQR(_imageData: ImageData): string | null {
  // TODO: Integrate jsQR or similar library for actual QR decoding
  // import jsQR from "jsqr";
  // const code = jsQR(imageData.data, imageData.width, imageData.height);
  // return code?.data || null;
  return null;
}
