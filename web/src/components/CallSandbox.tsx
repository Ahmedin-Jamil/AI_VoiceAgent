"use client";

import React, { useState, useEffect, useRef } from "react";
import { Phone, PhoneOff, Mic, MicOff, Volume2, Sparkles, Activity, Clock, Zap } from "lucide-react";
import { AudioVisualizer } from "./AudioVisualizer";

interface Message {
  id: string;
  sender: "user" | "agent";
  text: string;
  timestamp: string;
  toolUsed?: string;
  latencyMs?: number;
}

interface CallSandboxProps {
  currentDialect: string;
  onDialectChange: (dialect: string) => void;
  systemPrompt: string;
}

export const CallSandbox: React.FC<CallSandboxProps> = ({
  currentDialect,
  onDialectChange,
}) => {
  const [callActive, setCallActive] = useState<boolean>(false);
  const [agentState, setAgentState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [currentLatency, setCurrentLatency] = useState<number>(290);
  const transcriptBottomRef = useRef<HTMLDivElement | null>(null);


  // Timer for active call
  useEffect(() => {
    if (!callActive) return;
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [callActive]);

  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, agentState]);

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`;
  };

  // Authentic Saudi Arabic audio via backend edge-tts (ar-SA-HamedNeural / ZariyahNeural)
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speakAudio = async (text: string) => {
    if (isMuted) return;

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    try {
      setAgentState("speaking");

      // Call FastAPI backend /api/tts directly
      const response = await fetch("http://localhost:8000/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`TTS HTTP error: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        setAgentState("listening");
      };
      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        URL.revokeObjectURL(url);
        audioRef.current = null;
        setAgentState("listening");
      };

      await audio.play();
    } catch (err) {
      console.error("ElevenLabs / Backend TTS error:", err);
      setTimeout(() => setAgentState("listening"), 2500);
    }
  };

  const handleStartCall = async () => {
    setCallActive(true);
    setAgentState("speaking");
    setCurrentLatency(285);

    // Initial warm Saudi greeting
    const greetingText =
      currentDialect === "najdi"
        ? "يا هلا والله ومرحبا! حياك الله في منصة سند، كيف أقدر أخدمك طال عمرك؟"
        : currentDialect === "hijazi"
        ? "أهلاً وسهلاً ومرحبتين! معك سند لخدمة العملاء، كيف أقدر أساعدك اليوم؟"
        : currentDialect === "fusha"
        ? "أهلاً وسهلاً بك في منصة سند الذكية. كيف يمكنني مساعدتك اليوم؟"
        : "يا هلا والله ومرحبا، معك سند! How can I assist you today?";

    const initialMsg: Message = {
      id: "msg-1",
      sender: "agent",
      text: greetingText,
      timestamp: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
      latencyMs: 140,
    };

    setMessages([initialMsg]);

    // Audible speech output
    speakAudio(greetingText);
  };

  const handleEndCall = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setCallActive(false);
    setAgentState("idle");
    setCallDuration(0);
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (nextMute && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setAgentState("listening");
    }
  };

  // Simulate user speaking during test
  const handleSimulateUserSpeech = async (userText: string, expectedTool?: string, agentReply?: string) => {
    if (!callActive) return;

    // 1. User speaks
    setAgentState("listening");
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setAgentState("thinking");
    setCurrentLatency(Math.floor(270 + Math.random() * 60));

    // 2. Fetch or construct dynamic reply
    const replyText =
      agentReply ||
      "أبشر بسعدك! الشحنة جاهزة والتوصيل للرياض اليوم إن شاء الله.";

    const replyMsg: Message = {
      id: `agent-${Date.now()}`,
      sender: "agent",
      text: replyText,
      timestamp: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
      toolUsed: expectedTool,
      latencyMs: currentLatency,
    };
    setMessages((prev) => [...prev, replyMsg]);

    // Audible speech output via ElevenLabs
    speakAudio(replyText);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto py-6 px-4">
      {/* Center Stage: Audio Visualizer & Call Controls (7 cols) */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col items-center justify-between min-h-[460px]">
          {/* Top Status Bar */}
          <div className="w-full flex items-center justify-between border-b border-zinc-800/60 pb-4">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${callActive ? "bg-emerald-500 animate-ping" : "bg-zinc-600"}`} />
              <span className="text-xs font-semibold tracking-wide uppercase text-zinc-300">
                {callActive ? "مكالمة صوتية نشطة (WebRTC)" : "المكالمة متوقفة"}
              </span>
            </div>
            {callActive && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-mono">
                <Clock className="w-3 h-3 text-emerald-400" />
                <span>{formatDuration(callDuration)}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">اللهجة:</span>
              <select
                value={currentDialect}
                onChange={(e) => onDialectChange(e.target.value)}
                disabled={callActive}
                className="bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 px-2.5 py-1 focus:outline-none focus:border-emerald-500"
              >
                <option value="najdi">نجدية (الرياض)</option>
                <option value="hijazi">حجازية (الغربية)</option>
                <option value="fusha">فصحى معاصرة</option>
                <option value="bilingual">ثنائي اللغة (AR/EN)</option>
              </select>
            </div>
          </div>

          {/* Central Animated Audio Visualizer */}
          <AudioVisualizer isActive={callActive} state={agentState} volumeLevel={0.65} />

          {/* Call Action Bar */}
          <div className="w-full pt-4 border-t border-zinc-800/60 flex items-center justify-center gap-4">
            {!callActive ? (
              <button
                onClick={handleStartCall}
                className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-all shadow-lg shadow-emerald-600/30 hover:scale-105 active:scale-95"
              >
                <Phone className="w-4 h-4" />
                <span>بدء المكالمة التجريبية (Start Call)</span>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleMute}
                  className={`p-3 rounded-full border transition-all ${
                    isMuted
                      ? "bg-red-500/20 border-red-500/40 text-red-400"
                      : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                  }`}
                  title={isMuted ? "إلغاء كتم الصوت" : "كتم الصوت"}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <button
                  onClick={handleEndCall}
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-medium text-sm transition-all shadow-lg shadow-red-600/30 active:scale-95"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>إنهاء المكالمة</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Simulation Prompts (Test Scenarios for Saudi B2B Demo) */}
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              سيناريوهات اختبار جاهزة (Saudi Enterprise Use-Cases)
            </span>
            <span className="text-[11px] text-zinc-500">انقر للاستماع للرد الصوتي</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <button
              onClick={() =>
                handleSimulateUserSpeech(
                  "يا سند، ايش شركات التأمين المعتمدة في مجمع العيادات؟",
                  "search_knowledge_base",
                  "نقبل معظم شركات التأمين الكبرى طال عمرك: التعاونية، بوبا العربية، وميدغلف، ونتحقق من أهليتك مباشرة برقم الهوية."
                )
              }
              disabled={!callActive}
              className="text-right p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-emerald-500/40 hover:bg-zinc-900 transition-all text-xs text-zinc-300 disabled:opacity-40 disabled:pointer-events-none"
            >
              <div className="font-semibold text-emerald-400 mb-1">عيادات طبية (تأمين)</div>
              <div className="text-[11px] text-zinc-400 truncate">&quot;ايش شركات التأمين المعتمدة؟&quot;</div>
            </button>

            <button
              onClick={() =>
                handleSimulateUserSpeech(
                  "أبي أتتبع شحنتي رقم SA-9823412 متى توصل الرياض؟",
                  "track_saudi_shipment",
                  "أبشر بسعدك! الشحنة رقم SA-9823412 خرجت مع المندوب للتوصيل اليوم بالرياض قبل الساعة 6:00 مساءً."
                )
              }
              disabled={!callActive}
              className="text-right p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-emerald-500/40 hover:bg-zinc-900 transition-all text-xs text-zinc-300 disabled:opacity-40 disabled:pointer-events-none"
            >
              <div className="font-semibold text-emerald-400 mb-1">لوجستيات وتوصيل</div>
              <div className="text-[11px] text-zinc-400 truncate">&quot;أبي أتتبع شحنتي رقم SA-...&quot;</div>
            </button>

            <button
              onClick={() =>
                handleSimulateUserSpeech(
                  "لو سمحت حولني على موظف خدمة العملاء المشرف",
                  "escalate_to_human_specialist",
                  "سمّ طال عمرك! بحولك حالاً لأحد ممثلي العمليات في الرياض، لحظات خليك معي على الخط."
                )
              }
              disabled={!callActive}
              className="text-right p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-emerald-500/40 hover:bg-zinc-900 transition-all text-xs text-zinc-300 disabled:opacity-40 disabled:pointer-events-none"
            >
              <div className="font-semibold text-emerald-400 mb-1">تحويل لموظف بشري</div>
              <div className="text-[11px] text-zinc-400 truncate">&quot;حولني على موظف بشري&quot;</div>
            </button>
          </div>
        </div>
      </div>

      {/* Right Stage: Live Dialogue Stream & Telemetry (5 cols) */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        {/* Real-time Transcript Stream */}
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5 shadow-2xl flex flex-col h-[350px]">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-3">
            <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              النص المباشر للمكالمة (Live Transcript)
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
              {messages.length} رسائل
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-center px-4">
                <Mic className="w-8 h-8 mb-2 opacity-30" />
                <p>اضغط &quot;بدء المكالمة&quot; للتحدث مع المساعد الصوتي أو استخدم السيناريوهات التجريبية.</p>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.sender === "user" ? "items-start" : "items-end"
                  }`}
                >
                  <div className="flex items-center gap-1 text-[10px] text-zinc-500 mb-1">
                    <span>{m.sender === "user" ? "المتصل (Caller)" : "سند (Sanad AI)"}</span>
                    <span>•</span>
                    <span>{m.timestamp}</span>
                    {m.latencyMs && (
                      <span className="text-emerald-400 font-mono">({m.latencyMs}ms)</span>
                    )}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                      m.sender === "user"
                        ? "bg-zinc-800 text-zinc-100 rounded-tl-none border border-zinc-700/60"
                        : "bg-emerald-950/40 text-emerald-100 rounded-tr-none border border-emerald-800/40"
                    }`}
                  >
                    {m.text}
                    {m.toolUsed && (
                      <div className="mt-1.5 pt-1 border-t border-emerald-800/40 text-[10px] text-emerald-300 flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        <span>تم تنفيذ الأداة: {m.toolUsed}()</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={transcriptBottomRef} />
          </div>
        </div>

        {/* Live Architecture Latency Telemetry */}
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-4">
            <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              زمن الاستجابة والمقاييس الحية (Telemetry)
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              {currentLatency}ms Total Latency
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-zinc-900">
              <span className="text-zinc-400">1. كشف الصوت (Silero VAD)</span>
              <span className="font-mono text-zinc-200">~35ms</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-zinc-900">
              <span className="text-zinc-400">2. تحويل الصوت لنص (Faster-Whisper)</span>
              <span className="font-mono text-zinc-200">~120ms</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-zinc-900">
              <span className="text-zinc-400">3. التفكير والرد (Llama-3.1-8B)</span>
              <span className="font-mono text-zinc-200">~90ms TTFT</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-zinc-900">
              <span className="text-zinc-400">4. توليد الصوت السعودي (Neural TTS)</span>
              <span className="font-mono text-zinc-200">~45ms First Chunk</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-zinc-400">تكلفة الدقيقة (Per-Minute Fee)</span>
              <span className="font-bold text-emerald-400">0.00 ريال (100% سيادي محلي)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
