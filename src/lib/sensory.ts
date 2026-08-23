"use client";

// Sensory sound & haptic engine for AQA Event
// Generates lightweight synthetic tones using Web Audio API (0 external assets)

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {
        // Resume on interaction
      });
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export type SensorySoundType =
  | "click"
  | "tap"
  | "flip"
  | "success"
  | "warning"
  | "error"
  | "sparkle";

export function isSensorySoundEnabled(): boolean {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return true;
  try {
    const pref = localStorage.getItem("aqa_sensory_sound");
    return pref === null || pref === "true";
  } catch {
    return true;
  }
}

export function setSensorySoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem("aqa_sensory_sound", enabled ? "true" : "false");
  } catch {
    // Ignore storage errors
  }
}

export function triggerHaptic(type: "light" | "medium" | "heavy" | "success" | "warning" = "light"): void {
  if (typeof window === "undefined" || !("vibrate" in navigator)) return;
  try {
    switch (type) {
      case "light":
        navigator.vibrate(10);
        break;
      case "medium":
        navigator.vibrate(25);
        break;
      case "heavy":
        navigator.vibrate(45);
        break;
      case "success":
        navigator.vibrate([15, 40, 20]);
        break;
      case "warning":
        navigator.vibrate([30, 50, 30]);
        break;
    }
  } catch {
    // Ignore haptic failures
  }
}

export function playSensorySound(type: SensorySoundType): void {
  if (!isSensorySoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    if (type === "click" || type === "tap") {
      // Soft crisp UI micro-tick
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(type === "click" ? 1400 : 950, now);
      osc.frequency.exponentialRampToValueAtTime(type === "click" ? 400 : 300, now + 0.025);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.025);
    } else if (type === "flip") {
      // Card flip whoosh
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(740, now + 0.07);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } else if (type === "success") {
      // Harmonic major chime (E5 -> G#5 -> B5)
      const frequencies = [659.25, 830.61, 987.77];
      frequencies.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startDelay = index * 0.045;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + startDelay);

        gain.gain.setValueAtTime(0.07, now + startDelay);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + startDelay + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + startDelay);
        osc.stop(now + startDelay + 0.22);
      });
      triggerHaptic("success");
    } else if (type === "warning") {
      // Dual subtle warning pulse
      const frequencies = [440, 370];
      frequencies.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startDelay = index * 0.08;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + startDelay);

        gain.gain.setValueAtTime(0.06, now + startDelay);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + startDelay + 0.16);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + startDelay);
        osc.stop(now + startDelay + 0.16);
      });
      triggerHaptic("warning");
    } else if (type === "error") {
      // Gentle rejection tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
      triggerHaptic("heavy");
    } else if (type === "sparkle") {
      // High twinkling chime
      const frequencies = [1046.5, 1318.5, 1567.98, 2093.0];
      frequencies.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startDelay = index * 0.035;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + startDelay);

        gain.gain.setValueAtTime(0.04, now + startDelay);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + startDelay + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + startDelay);
        osc.stop(now + startDelay + 0.18);
      });
    }
  } catch {
    // Gracefully handle any audio output error
  }
}
