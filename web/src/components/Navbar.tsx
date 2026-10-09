"use client";

import React from "react";
import { ShieldCheck, Cpu, Mic, Settings, BarChart3, PhoneCall } from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: "sandbox", label: "مختبر المكالمات (Sandbox)", icon: Mic },
    { id: "studio", label: "استوديو المساعد (Studio)", icon: Settings },
    { id: "telemetry", label: "المقاييس الحية (Telemetry)", icon: BarChart3 },
    { id: "telephony", label: "الربط الهاتفي (SIP Hub)", icon: PhoneCall },
  ];

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Market Position */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Mic className="w-5 h-5 text-zinc-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white">SANAD VOICE AI</span>
              <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                Saudi Sovereign
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              منصة مركز الاتصال الصوتي الذكي السيادي (Riyadh B2B Enterprise)
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center bg-zinc-900/90 border border-zinc-800 rounded-xl p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/60"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-emerald-400" : ""}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* PDPL & Architecture Status Badge */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>نظام PDPL (سيادة محلية 100%)</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>Gemini 3.8 + ElevenLabs</span>
          </div>
        </div>
      </div>
    </header>
  );
};
