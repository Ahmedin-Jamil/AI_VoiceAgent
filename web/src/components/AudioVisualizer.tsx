"use client";

import React, { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  isActive: boolean;
  state: "idle" | "listening" | "thinking" | "speaking";
  volumeLevel?: number; // 0.0 to 1.0
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isActive,
  state,
  volumeLevel = 0.5,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      // Color palette based on agent state
      let strokeColor = "rgba(113, 113, 122, 0.3)"; // default zinc
      let glowColor = "rgba(16, 185, 129, 0.2)";
      let waveSpeed = 0.02;
      let amplitudeMultiplier = 0.2;

      if (isActive) {
        if (state === "listening") {
          strokeColor = "rgba(16, 185, 129, 0.85)"; // Emerald
          glowColor = "rgba(16, 185, 129, 0.4)";
          waveSpeed = 0.06;
          amplitudeMultiplier = 0.6 + volumeLevel * 0.8;
        } else if (state === "thinking") {
          strokeColor = "rgba(139, 92, 246, 0.85)"; // Purple
          glowColor = "rgba(139, 92, 246, 0.4)";
          waveSpeed = 0.08;
          amplitudeMultiplier = 0.4;
        } else if (state === "speaking") {
          strokeColor = "rgba(59, 130, 246, 0.9)"; // Electric Blue
          glowColor = "rgba(59, 130, 246, 0.5)";
          waveSpeed = 0.07;
          amplitudeMultiplier = 0.9 + volumeLevel;
        }
      }

      ctx.save();
      ctx.shadowBlur = isActive ? 15 : 0;
      ctx.shadowColor = glowColor;

      // Draw multi-layered organic sine waves (ElevenLabs / Vapi waveform aesthetic)
      const lines = [
        { amp: 22 * amplitudeMultiplier, freq: 0.015, alpha: 0.8, lineWidth: 2.5 },
        { amp: 14 * amplitudeMultiplier, freq: 0.025, alpha: 0.5, lineWidth: 1.5 },
        { amp: 30 * amplitudeMultiplier, freq: 0.01, alpha: 0.3, lineWidth: 1.0 },
      ];

      lines.forEach((line, index) => {
        ctx.beginPath();
        ctx.strokeStyle = strokeColor.replace(/[\d\.]+\)$/, `${line.alpha})`);
        ctx.lineWidth = line.lineWidth;

        for (let x = 0; x < width; x++) {
          // Attenuate waves towards edges (smooth windowing)
          const envelope = Math.sin((x / width) * Math.PI);
          const y =
            centerY +
            Math.sin(x * line.freq + phase + index * 1.5) * line.amp * envelope;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      ctx.restore();

      phase += waveSpeed;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isActive, state, volumeLevel]);

  const getStateBadge = () => {
    switch (state) {
      case "listening":
        return { text: "الاستماع للمتصل (Silero VAD)", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" };
      case "thinking":
        return { text: "معالجة الرد (Llama 3.1 / ALLAM)", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" };
      case "speaking":
        return { text: "تحدث المساعد (Saudi Neural TTS)", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
      default:
        return { text: "في وضع الاستعداد", color: "bg-zinc-800 text-zinc-400 border-zinc-700" };
    }
  };

  const badge = getStateBadge();

  return (
    <div className="relative flex flex-col items-center justify-center p-8 w-full max-w-xl mx-auto">
      {/* Central Visualizer Glow Orb */}
      <div className="relative flex items-center justify-center w-48 h-48 mb-6">
        <div
          className={`absolute inset-0 rounded-full transition-all duration-700 ${
            isActive ? "voice-orb-active" : ""
          } ${
            state === "listening"
              ? "bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 shadow-emerald-500/20"
              : state === "thinking"
              ? "bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 border border-purple-500/40 shadow-purple-500/20"
              : state === "speaking"
              ? "bg-gradient-to-tr from-blue-500/20 to-cyan-500/20 border border-blue-500/40 shadow-blue-500/20"
              : "bg-zinc-900/80 border border-zinc-800"
          } backdrop-blur-md shadow-2xl flex items-center justify-center`}
        >
          {/* Inner Pulsing Rings */}
          <div
            className={`w-28 h-28 rounded-full border transition-all duration-500 flex items-center justify-center ${
              isActive
                ? state === "listening"
                  ? "border-emerald-400/50 scale-105"
                  : state === "thinking"
                  ? "border-purple-400/50 animate-spin"
                  : "border-blue-400/50 scale-110"
                : "border-zinc-700/40"
            }`}
          >
            <div
              className={`w-16 h-16 rounded-full transition-all duration-500 ${
                isActive
                  ? state === "listening"
                    ? "bg-emerald-500/30 shadow-lg shadow-emerald-500/50"
                    : state === "thinking"
                    ? "bg-purple-500/30 shadow-lg shadow-purple-500/50"
                    : "bg-blue-500/30 shadow-lg shadow-blue-500/50"
                  : "bg-zinc-800"
              }`}
            />
          </div>
        </div>
      </div>

      {/* Real-time Waveform Canvas */}
      <div className="w-full h-24 bg-zinc-950/60 rounded-xl border border-zinc-800/80 p-2 overflow-hidden shadow-inner flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={500}
          height={96}
          className="w-full h-full"
        />
      </div>

      {/* State Badge */}
      <div className="mt-4 flex items-center gap-2">
        <span className={`px-3 py-1 text-xs font-medium rounded-full border ${badge.color}`}>
          {badge.text}
        </span>
      </div>
    </div>
  );
};
