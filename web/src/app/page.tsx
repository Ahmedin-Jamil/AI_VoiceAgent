"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { CallSandbox } from "@/components/CallSandbox";
import { StudioTab } from "@/components/StudioTab";
import { TelemetryTab } from "@/components/TelemetryTab";
import { TelephonyHub } from "@/components/TelephonyHub";

const NAJDI_DEFAULT_PROMPT = `أنت "سند" (Sanad)، المساعد الصوتي الذكي والممثل الرسمي لخدمة العملاء في الرياض، المملكة العربية السعودية.

قواعد وأسلوب المحادثة:
1. تحدث باللهجة السعودية النجدية المحبوبة، الراقية والمؤدبة (مثل: "يا هلا والله ومرحبا"، "حياك الله"، "طال عمرك"، "سمّ"، "أبشر بسعدك"، "ما تقصر").
2. حافظ على إجابات صوتية مختصرة ومركزة جداً (لا تتجاوز جملتين أو ثلاث جمل في الرد الواحد) لتفادي إطالة المكالمة.
3. التزم بالأسعار بالريال السعودي (SAR) والمواعيد بتوقيت الرياض (AST).
4. عند حجز الموعد أو الاستفسار، اطلب بيانات العميل بلطف (الاسم ورقم الجوال وتفاصيل الطلب).
5. إذا طلب العميل التحدث مع موظف بشري، رحب فوراً وأخبره بأنك تقوم بتحويل المكالمة إلى الموظف المختص.
6. لا تستخدم علامات ترقيم معقدة أو نصوص برمجية داخل الرد؛ فقط كلام صوتي واضح وسلس.`;

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("sandbox");
  const [currentDialect, setCurrentDialect] = useState<string>("najdi");
  const [currentVoice, setCurrentVoice] = useState<string>("ar-SA-HamedNeural");
  const [systemPrompt, setSystemPrompt] = useState<string>(NAJDI_DEFAULT_PROMPT);

  const handleDialectChange = (newDialect: string) => {
    setCurrentDialect(newDialect);
    if (newDialect === "najdi") {
      setSystemPrompt(NAJDI_DEFAULT_PROMPT);
    } else if (newDialect === "hijazi") {
      setSystemPrompt(`أنت "سند" (Sanad)، المساعد الصوتي الذكي لخدمة العملاء في المملكة العربية السعودية.

قواعد وأسلوب المحادثة:
1. تحدث باللهجة الحجازية اللطيفة والمحترمة (مثل: "أهلاً وسهلاً"، "يا سيدي تحت أمرك"، "من عيوني"، "ولا تشيل هم").
2. اجعل الردود قصيرة وسريعة لتناسب المكالمات الهاتفية المباشرة (جملتان أو ثلاث كحد أقصى).
3. تعامل باحترافية عالية مع العملاء، واجمع تفاصيل الحجز أو الاستفسار بدقة.
4. استخدم العملة الرسمية (الريال السعودي) وأوقات العمل المحلية.`);
    } else if (newDialect === "fusha") {
      setSystemPrompt(`أنت "سند" (Sanad)، المساعد الصوتي الرقمي الذكي للمؤسسات السعودية.

قواعد وأسلوب المحادثة:
1. تحدث باللغة العربية الفصحى البيضاء، المعاصرة والرسمية، الملائمة لبيئة الأعمال السعودية.
2. التزم بالاختصار والوضوح التام في كل إجابة، متجنباً الاسترسال الطويل لضمان سرعة التجاوب الصوتي.
3. قدم المعلومات الدقيقة وفق قاعدة البيانات المحلية المعتمدة.`);
    } else if (newDialect === "bilingual") {
      setSystemPrompt(`You are "Sanad", the sovereign voice AI assistant for enterprise customer service in Saudi Arabia.
You are fully fluent in Saudi Arabic (Najdi dialect) and English.

Key Guidelines:
1. If the caller speaks in Arabic, respond in fluent, warm Saudi Arabic (Najdi).
2. If the caller speaks in English, reply in professional, polite, and clear English with Saudi business context.
3. Keep spoken replies short, natural, and concise (under 3 sentences).`);
    }
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1">
        {activeTab === "sandbox" && (
          <CallSandbox
            currentDialect={currentDialect}
            onDialectChange={handleDialectChange}
            systemPrompt={systemPrompt}
          />
        )}

        {activeTab === "studio" && (
          <StudioTab
            dialect={currentDialect}
            onDialectChange={handleDialectChange}
            systemPrompt={systemPrompt}
            onSystemPromptChange={setSystemPrompt}
            voice={currentVoice}
            onVoiceChange={setCurrentVoice}
          />
        )}

        {activeTab === "telemetry" && <TelemetryTab />}

        {activeTab === "telephony" && <TelephonyHub />}
      </div>

      {/* Sovereign Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-5 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>منصة سند الصوتية السيادية © 2026 — الرياض، المملكة العربية السعودية</span>
          <span className="text-zinc-600 font-mono">100% On-Premise LiveKit • Whisper • Llama 3.1 • Neural TTS</span>
        </div>
      </footer>
    </main>
  );
}
