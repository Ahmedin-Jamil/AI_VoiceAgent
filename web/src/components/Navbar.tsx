"use client";

import React from "react";
import { Mic, Radio } from "lucide-react";

export const Navbar: React.FC = () => {
  return (
    <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-50 px-4 md:px-8 py-3.5 shadow-xs">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-700 flex items-center justify-center shadow-xs">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base md:text-lg tracking-tight text-slate-900">
                LevelLM • الذكاء الصوتي
              </span>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold px-2 py-0.5 rounded-full">
                صوتي مباشر
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              المنصة الصوتية الذكية لخدمة العملاء في المملكة العربية السعودية
            </p>
          </div>
        </div>

        {/* Live System Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
          <Radio className="w-3.5 h-3.5 text-emerald-700 animate-pulse" />
          <span>المساعد جاهز للاتصال</span>
        </div>
      </div>
    </header>
  );
};
