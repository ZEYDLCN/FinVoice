"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MicStatus = "idle" | "requesting" | "granted" | "denied" | "error";

/**
 * Captures the microphone (getUserMedia — the media-capture half of the
 * WebRTC stack) and exposes a 0..1 volume level via the Web Audio API.
 *
 * This is the Phase 2 "voice gateway" skeleton: it proves mic permission
 * and audio capture work end-to-end in the browser. It intentionally does
 * NOT open an RTCPeerConnection or stream audio anywhere yet — there is no
 * STT backend to send it to until Faz 3 (Silero VAD + faster-whisper).
 * Wiring that transport up is Faz 3's job; this hook is what it will sit on
 * top of.
 */
export function useMicrophone() {
  const [status, setStatus] = useState<MicStatus>("idle");
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    setLevel(0);
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError("Bu tarayıcı mikrofon erişimini desteklemiyor.");
      return;
    }
    setStatus("requesting");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sumSquares = 0;
        for (const v of data) {
          const normalized = (v - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / data.length);
        setLevel(Math.min(1, rms * 4));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
      setStatus("granted");
    } catch (err) {
      setStatus("denied");
      setError(err instanceof Error ? err.message : "Mikrofon erişimi reddedildi.");
    }
  }, []);

  useEffect(() => stop, [stop]);

  return { status, level, error, start, stop };
}
