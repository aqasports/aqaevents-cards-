"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, type CameraDevice } from "html5-qrcode";

export default function Scanner({
  onScanSuccess,
  isPaused,
}: {
  onScanSuccess: (decodedText: string) => void;
  isPaused: boolean;
}) {
  const containerId = "qrc-reader";
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const [cameraPermission, setCameraPermission] = useState<"pending" | "granted" | "denied">("pending");
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");

  useEffect(() => {
    // Request permission and enumerate cameras
    Html5Qrcode.getCameras()
      .then((devices) => {
        setCameras(devices);
        if (devices.length > 0) {
          setCameraPermission("granted");
          // Default to back camera if available
          const backCam = devices.find((device) =>
            device.label.toLowerCase().includes("back") ||
            device.label.toLowerCase().includes("environment")
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setCameraPermission("denied");
        }
      })
      .catch((err) => {
        console.error("Camera listing error:", err);
        setCameraPermission("denied");
      });

    return () => {
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().catch(console.error);
      }
    };
  }, []);

  useEffect(() => {
    if (cameraPermission !== "granted" || !selectedCameraId) return;

    const html5Qrcode = new Html5Qrcode(containerId);
    html5QrcodeRef.current = html5Qrcode;

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
    };

    html5Qrcode
      .start(
        selectedCameraId,
        config,
        (decodedText) => {
          if (!isPaused) {
            onScanSuccess(decodedText);
          }
        },
        (errorMessage) => {
          // Silent debug logs for normal frame failures
        }
      )
      .catch((err) => {
        console.error("Failed to start scanning:", err);
      });

    return () => {
      if (html5Qrcode.isScanning) {
        html5Qrcode.stop().catch(console.error);
      }
    };
  }, [selectedCameraId, cameraPermission, isPaused]);

  return (
    <div className="space-y-4">
      <div className="relative aspect-square w-full max-w-md mx-auto overflow-hidden rounded-2xl border-2 border-[var(--border)] bg-slate-950 shadow-inner">
        <div id={containerId} className="w-full h-full" />
        
        {/* Scanning Target Overlay */}
        {cameraPermission === "granted" && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-60 h-60 border-2 border-[var(--primary)] rounded-2xl relative">
              <div className="absolute -top-1.5 -left-1.5 w-6 h-6 border-t-4 border-l-4 border-[var(--primary)] rounded-tl-md" />
              <div className="absolute -top-1.5 -right-1.5 w-6 h-6 border-t-4 border-r-4 border-[var(--primary)] rounded-tr-md" />
              <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-4 border-l-4 border-[var(--primary)] rounded-bl-md" />
              <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-4 border-r-4 border-[var(--primary)] rounded-br-md" />
              {!isPaused && (
                <div className="absolute left-0 right-0 h-0.5 bg-[var(--primary)] shadow-[0_0_8px_var(--primary)] animate-bounce" style={{ top: "10%" }} />
              )}
            </div>
          </div>
        )}

        {cameraPermission === "pending" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white p-4 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-[var(--primary)] mb-3" />
            <p className="text-sm font-semibold">Requesting camera access...</p>
          </div>
        )}

        {cameraPermission === "denied" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-400 p-6 text-center">
            <svg className="h-12 w-12 text-red-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm font-bold text-white mb-1">Camera Access Denied</p>
            <p className="text-xs">Please allow camera permissions in your browser settings to scan AQA cards.</p>
          </div>
        )}
      </div>

      {cameras.length > 1 && (
        <div className="max-w-md mx-auto">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
            Select Camera
          </label>
          <select
            value={selectedCameraId}
            onChange={(e) => setSelectedCameraId(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[var(--primary)]"
          >
            {cameras.map((camera) => (
              <option key={camera.id} value={camera.id}>
                {camera.label || `Camera ${camera.id.slice(0, 5)}`}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
