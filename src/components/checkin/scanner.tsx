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
      <div className="relative aspect-square w-full max-w-md mx-auto overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 shadow-[0_0_30px_rgba(14,165,233,0.1)] backdrop-blur-md">
        <div id={containerId} className="w-full h-full" />
        
        {/* Sci-Fi HUD Scanning Target Overlay */}
        {cameraPermission === "granted" && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Ambient radar pulse ring */}
            <div className="absolute w-72 h-72 rounded-full border border-cyan-500/20 animate-radar-pulse pointer-events-none" />

            <div className="w-64 h-64 border border-cyan-500/30 rounded-3xl relative shadow-[0_0_30px_rgba(0,242,255,0.15)] bg-cyan-950/5">
              {/* Glowing Sci-Fi Corner Reticles */}
              <div className="absolute -top-2 -left-2 w-7 h-7 border-t-3 border-l-3 border-cyan-400 rounded-tl-xl shadow-[0_0_10px_#00f2ff]" />
              <div className="absolute -top-2 -right-2 w-7 h-7 border-t-3 border-r-3 border-cyan-400 rounded-tr-xl shadow-[0_0_10px_#00f2ff]" />
              <div className="absolute -bottom-2 -left-2 w-7 h-7 border-b-3 border-l-3 border-cyan-400 rounded-bl-xl shadow-[0_0_10px_#00f2ff]" />
              <div className="absolute -bottom-2 -right-2 w-7 h-7 border-b-3 border-r-3 border-cyan-400 rounded-br-xl shadow-[0_0_10px_#00f2ff]" />

              {/* Center subtle crosshair marks */}
              <div className="absolute top-1/2 left-3 right-3 h-[1px] bg-cyan-400/15" />
              <div className="absolute left-1/2 top-3 bottom-3 w-[1px] bg-cyan-400/15" />
              
              {/* Sweeping Laser Scan Line */}
              {!isPaused && (
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_15px_#00f2ff] animate-laser-sweep">
                  <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#00f2ff]" />
                </div>
              )}
            </div>
          </div>
        )}

        {cameraPermission === "pending" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-white p-4 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-cyan-400 mb-3" />
            <p className="text-sm font-semibold text-slate-350">Requesting camera access...</p>
          </div>
        )}

        {cameraPermission === "denied" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-400 p-6 text-center">
            <svg className="h-12 w-12 text-red-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm font-bold text-white mb-1">Camera Access Denied</p>
            <p className="text-xs text-slate-500">Please allow camera permissions in your browser settings to scan AQA cards.</p>
          </div>
        )}
      </div>

      {cameras.length > 1 && (
        <div className="max-w-md mx-auto">
          <label className="block text-xs font-bold text-slate-450 mb-1.5 uppercase tracking-wide">
            Select Camera
          </label>
          <select
            value={selectedCameraId}
            onChange={(e) => setSelectedCameraId(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-900/60 text-white px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-cyan-500 backdrop-blur-md cursor-pointer"
          >
            {cameras.map((camera) => (
              <option key={camera.id} value={camera.id} className="bg-slate-900 text-white">
                {camera.label || `Camera ${camera.id.slice(0, 5)}`}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
