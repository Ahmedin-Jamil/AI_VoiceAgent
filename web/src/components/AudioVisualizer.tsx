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
  volumeLevel = 0.2,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    // Handle high-DPI displays (Retina screens on iPhone/Mac)
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = 340;
    const displayHeight = 110;
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    ctx.scale(dpr, dpr);

    const render = () => {
      ctx.clearRect(0, 0, displayWidth, displayHeight);
      const width = displayWidth;
      const height = displayHeight;
      const centerY = height / 2;

      // Color palette tuned for Apple / Gemini clean light theme
      let strokeColor = "rgba(148, 163, 184, 0.4)"; // soft slate
      let glowColor = "rgba(4, 120, 87, 0.15)";
      let waveSpeed = 0.03;
      let amplitudeMultiplier = 0.25;

      if (isActive) {
        if (state === "listening") {
          strokeColor = "rgba(4, 120, 87, 0.9)"; // Saudi Emerald #047857
          glowColor = "rgba(4, 120, 87, 0.25)";
          waveSpeed = 0.07;
          amplitudeMultiplier = 0.5 + volumeLevel * 0.9;
        } else if (state === "thinking") {
          strokeColor = "rgba(99, 102, 241, 0.9)"; // Indigo #6366f1
          glowColor = "rgba(99, 102, 241, 0.25)";
          waveSpeed = 0.09;
          amplitudeMultiplier = 0.45;
        } else if (state === "speaking") {
          strokeColor = "rgba(37, 99, 235, 0.95)"; // Sapphire Blue #2563eb
          glowColor = "rgba(37, 99, 235, 0.3)";
          waveSpeed = 0.08;
          amplitudeMultiplier = 0.8 + volumeLevel * 0.8;
        }
      }

      ctx.save();
      ctx.shadowBlur = isActive ? 12 : 0;
      ctx.shadowColor = glowColor;

      // Draw multi-layered organic fluid soundwaves (Gemini Live & Apple Voice style)
      const lines = [
        { amp: 20 * amplitudeMultiplier, freq: 0.018, alpha: 0.9, lineWidth: 2.5 },
        { amp: 14 * amplitudeMultiplier, freq: 0.028, alpha: 0.55, lineWidth: 1.8 },
        { amp: 26 * amplitudeMultiplier, freq: 0.012, alpha: 0.35, lineWidth: 1.2 },
      ];

      lines.forEach((line, index) => {
        ctx.beginPath();
        ctx.strokeStyle = strokeColor.replace(/[\d\.]+\)$/, `${line.alpha})`);
        ctx.lineWidth = line.lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        for (let x = 0; x < width; x++) {
          // Attenuate waves towards edges (smooth windowing envelope)
          const envelope = Math.sin((x / width) * Math.PI);
          const y =
            centerY +
            Math.sin(x * line.freq + phase + index * 1.6) * line.amp * envelope;

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

  return (
    <div className="flex flex-col items-center justify-center w-full py-1">
      <canvas
        ref={canvasRef}
        style={{ width: "340px", height: "110px" }}
        className="max-w-full"
      />
    </div>
  );
};
