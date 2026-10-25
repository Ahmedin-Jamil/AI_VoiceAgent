"use client";

import React from "react";
import { VoiceExperience } from "@/components/VoiceExperience";

export default function Home() {
  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-900 relative overflow-hidden"
    >
      {/* Ambient Soft Radial Lights */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.08),transparent_65%)] pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-[550px] h-[450px] bg-[radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.04),transparent_60%)] pointer-events-none -z-10" />

      <div className="flex-1 flex flex-col">
        <VoiceExperience />
      </div>

      <footer className="border-t border-slate-200/90 bg-white/85 backdrop-blur-md py-3.5 text-center text-xs text-slate-500 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-slate-600 font-medium">
            منصة LevelLM الصوتية الذكية © 2026 — الرياض، المملكة العربية السعودية
          </span>
          <span className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            100% Google Gemini Native Voice • لهجة سعودية بيضاء • استجابة فورية 0ms
          </span>
        </div>
      </footer>
    </main>
  );
}
