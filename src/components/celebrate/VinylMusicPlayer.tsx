"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

interface Props {
  autoPlay?: boolean;
}

export default function VinylMusicPlayer({ autoPlay = false }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Fallback romantic melody synthesizer using Web Audio API
  const playRomanticSynthMelody = useCallback(() => {
    try {
      if (typeof window === "undefined") return;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      // Romantic chord notes progression: Cmaj7 - Am7 - Fmaj7 - G7
      const notes = [
        261.63, 329.63, 392.00, 493.88, // C4, E4, G4, B4
        220.00, 261.63, 329.63, 392.00, // A3, C4, E4, G4
        174.61, 220.00, 261.63, 329.63, // F3, A3, C4, E4
        196.00, 246.94, 293.66, 349.23, // G3, B3, D4, F4
      ];

      let noteIdx = 0;
      const playNextNote = () => {
        if (!audioContextRef.current) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(notes[noteIdx % notes.length], now);

        // Soft piano envelope
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.12, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 1.25);

        noteIdx++;
        synthTimerRef.current = window.setTimeout(playNextNote, 600);
      };

      playNextNote();
    } catch {
      // AudioContext not supported or blocked
    }
  }, []);

  const stopRomanticSynth = useCallback(() => {
    if (synthTimerRef.current !== null) {
      clearTimeout(synthTimerRef.current);
      synthTimerRef.current = null;
    }
  }, []);

  const startPlaying = useCallback(() => {
    if (audioRef.current) {
      try {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
            })
            .catch(() => {
              playRomanticSynthMelody();
              setIsPlaying(true);
            });
        } else {
          setIsPlaying(true);
        }
      } catch {
        playRomanticSynthMelody();
        setIsPlaying(true);
      }
    } else {
      playRomanticSynthMelody();
      setIsPlaying(true);
    }
  }, [playRomanticSynthMelody]);

  const stopPlaying = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {
        // ignore
      }
    }
    stopRomanticSynth();
    setIsPlaying(false);
  }, [stopRomanticSynth]);

  const togglePlay = () => {
    if (isPlaying) {
      stopPlaying();
    } else {
      startPlaying();
    }
  };

  useEffect(() => {
    if (autoPlay) {
      startPlaying();
    }
    return () => {
      stopRomanticSynth();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [autoPlay, startPlaying, stopRomanticSynth]);

  return (
    <div className="fixed top-5 right-5 z-40 flex items-center gap-2 bg-white/85 backdrop-blur-md border border-rose-200/80 px-3.5 py-1.5 rounded-full shadow-lg transition-all duration-300 hover:shadow-xl hover:border-rose-300">
      <audio
        ref={audioRef}
        src="/audio/romantic-piano.mp3"
        loop
        preload="auto"
      />

      <button
        type="button"
        onClick={togglePlay}
        className="flex items-center gap-2 group cursor-pointer text-xs font-bold text-rose-700"
        title={isPlaying ? "Tạm dừng nhạc" : "Bật giai điệu tình yêu"}
      >
        <span
          className={`w-7 h-7 rounded-full bg-slate-900 border-2 border-rose-400 flex items-center justify-center text-white text-xs shadow-sm transition-transform ${
            isPlaying ? "animate-spin" : ""
          }`}
          style={{ animationDuration: "3s" }}
        >
          🎵
        </span>
        <span className="hidden sm:inline">
          {isPlaying ? "Giai điệu tình yêu đang phát..." : "Bật nhạc lãng mạn"}
        </span>
      </button>
    </div>
  );
}
