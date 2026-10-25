"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  Loader2,
  Headphones,
  Send,
  Building2,
  Settings2,
  MessageCircle,
  RotateCcw,
  ExternalLink,
  Edit3,
  X,
  Zap,
  Radio,
  FileText,
  UserCheck,
  ShieldCheck,
  Clock,
  Sparkles,
  ChevronDown,
  User,
  SlidersHorizontal,
} from "lucide-react";
import { AudioRecorder } from "@/utils/audioRecorder";

export type EnterpriseMode =
  | "general_support"
  | "lead_intake"
  | "ticket_followup"
  | "custom_profile";

interface Message {
  id: string;
  sender: "user" | "agent";
  text: string;
  timestamp: string;
}

interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

interface CRMCustomer {
  found: boolean;
  name?: string;
  phone?: string;
  vip?: boolean;
  open_inquiry?: string;
  status?: string;
}

const VOICE_PERSONAS: Record<
  string,
  {
    name: string;
    subname: string;
    tone: string;
    gender: "male" | "female";
    description: string;
    greeting: string;
    accentColor: string;
    glowColor: string;
  }
> = {
  Charon: {
    name: "سعود",
    subname: "Saud (Charon)",
    tone: "نبرة نجدية وقورة وعميقة",
    gender: "male",
    description: "مستشار خدمة العملاء الذكي • صوت رجالي عميق ودافئ يمنح الثقة والاطمئنان",
    greeting: "يا هلا والله ومسهلا! معك سعود من خدمة العملاء.. سم أمرني، وش أقدر أخدمك فيه اليوم يا غالي؟",
    accentColor: "from-emerald-600 via-teal-500 to-emerald-400",
    glowColor: "rgba(16, 185, 129, 0.35)",
  },
  Fenrir: {
    name: "فيصل",
    subname: "Faisal (Fenrir)",
    tone: "نبرة واثقة متزنة وسريعة البديهة",
    gender: "male",
    description: "مستشار الدعم والعمليات • صوت شبابي نشيط ومحترف لحل المشكلات",
    greeting: "يا هلا ومسهلا! معك فيصل من الدعم المباشر.. سم وش موضوعك وأبشر بالحل الفوري؟",
    accentColor: "from-cyan-600 via-blue-500 to-teal-400",
    glowColor: "rgba(6, 182, 212, 0.35)",
  },
  Aoede: {
    name: "سارة",
    subname: "Sara (Aoede)",
    tone: "صوت نسائي راقي وودود",
    gender: "female",
    description: "مستشارة الاستقبال وتجربة العميل • أسلوب راقي، مهدئ ومريح للمتصلين",
    greeting: "يا هلا والله ومسهلا! معك سارة من خدمة العملاء.. آمرني وش أقدر أخدمك فيه اليوم؟",
    accentColor: "from-teal-500 via-emerald-400 to-amber-300",
    glowColor: "rgba(20, 184, 166, 0.35)",
  },
};

const CRM_PRESETS = [
  { label: "أبو فهد (0501234567)", phone: "0501234567", name: "أبو فهد", inquiry: "تأخر الشحنة رقم 892" },
  { label: "سارة القحطاني (0559876543)", phone: "0559876543", name: "سارة القحطاني", inquiry: "استفسار عن عقد الصيانة" },
  { label: "م. خالد العتيبي (0543322110)", phone: "0543322110", name: "م. خالد العتيبي", inquiry: "حجز موعد تجربة المنصة" },
  { label: "متصل جديد (غير مسجل)", phone: "", name: "متصل جديد", inquiry: "استفسار عام جديد" },
];

const SUGGESTED_INQUIRIES = [
  { label: "وش الخدمات اللي تقدمونها؟", text: "يا هلا سعود، وش الخدمات والحلول اللي تقدمونها؟" },
  { label: "نصيحة ذكية لتطوير أعمال المنشأة", text: "عطني نصيحة ذكية ومفيدة لتطوير الأعمال وخدمة العملاء." },
  { label: "أبغى أكلم المشرف المختص", text: "لو سمحت أبغى أكلم المشرف المختص بخصوص استفساري." },
];

export const VoiceExperience: React.FC = () => {
  const [selectedVoice, setSelectedVoice] = useState<string>("Charon");
  const [activeMode, setActiveMode] = useState<EnterpriseMode>("general_support");
  const [callActive, setCallActive] = useState<boolean>(false);
  const [agentState, setAgentState] = useState<
    "idle" | "listening" | "recording" | "thinking" | "speaking"
  >("idle");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [showTranscript, setShowTranscript] = useState<boolean>(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState<boolean>(false);

  // Live real-time caption showing what Saud is saying right now
  const [liveCaption, setLiveCaption] = useState<string>(
    VOICE_PERSONAS["Charon"].greeting
  );

  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [capturedLeadSummary, setCapturedLeadSummary] = useState<{
    inquiry: string;
    sentiment: string;
    callerName: string;
    phone: string;
    duration: number;
    requiresFollowup: boolean;
  } | null>(null);

  const [textInput, setTextInput] = useState<string>("");

  // Caller ID & CRM Lookup (Clean live universal caller by default)
  const [callerPhone, setCallerPhone] = useState<string>("");
  const [crmRecord, setCrmRecord] = useState<CRMCustomer | null>(null);
  const [isLookingUpCrm, setIsLookingUpCrm] = useState<boolean>(false);

  // Custom Company State (Universal Ingestion)
  const [customCompanyName, setCustomCompanyName] = useState<string>("منصة ليفل الذكية");
  const [customFaqText, setCustomFaqText] = useState<string>("");

  // Audio References
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const hasSpokenGreetingRef = useRef<boolean>(false);

  const currentPersona = VOICE_PERSONAS[selectedVoice] || VOICE_PERSONAS["Charon"];

  // Update caption when voice changes if not in call
  useEffect(() => {
    if (!callActive) {
      setLiveCaption(currentPersona.greeting);
    }
  }, [selectedVoice, callActive, currentPersona.greeting]);

  // Handle Caller Lookup from Server CRM
  const handlePhoneLookup = useCallback(async (phone: string) => {
    setCallerPhone(phone);
    if (!phone) {
      setCrmRecord({ found: false });
      return;
    }
    setIsLookingUpCrm(true);
    try {
      const res = await fetch(`/api/customer-lookup?phone=${encodeURIComponent(phone)}`);
      if (res.ok) {
        const data = await res.json();
        setCrmRecord(data);
      }
    } catch (err) {
      console.warn("CRM lookup failed:", err);
    } finally {
      setIsLookingUpCrm(false);
    }
  }, []);

  // Format call duration MM:SS
  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Auto-scroll transcript
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Clean-up audio resources on unmount
  useEffect(() => {
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (audioRecorderRef.current) {
        audioRecorderRef.current.close();
        audioRecorderRef.current = null;
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  // Stop Agent playback safely
  const stopAgentAudio = useCallback(() => {
    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
      } catch (e) {
        console.warn("Error stopping audio:", e);
      }
      audioPlayerRef.current = null;
    }
    if (audioRecorderRef.current) {
      audioRecorderRef.current.setAgentSpeaking(false);
    }
  }, []);

  // Resume listening after agent finishes speaking
  const resumeListening = useCallback(() => {
    setAgentState("listening");
    if (!isMuted && audioRecorderRef.current) {
      try {
        audioRecorderRef.current.setAgentSpeaking(false);
        audioRecorderRef.current.startListeningTurn();
      } catch (e) {
        console.warn("Resume listening error:", e);
      }
    }
  }, [isMuted]);

  // Play audio bytes returned by backend TTS
  const playAgentAudio = useCallback(
    async (text: string) => {
      setAgentState("speaking");
      setLiveCaption(text);
      stopAgentAudio();

      if (audioRecorderRef.current) {
        audioRecorderRef.current.setAgentSpeaking(true);
      }

      try {
        const ttsRes = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice: selectedVoice }),
        });
        if (!ttsRes.ok) throw new Error("TTS failed");
        const blob = await ttsRes.blob();
        const audioSrc = URL.createObjectURL(blob);

        const audio = new Audio(audioSrc);
        audioPlayerRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(audioSrc);
          audioPlayerRef.current = null;
          resumeListening();
        };

        audio.onerror = (e) => {
          console.warn("Audio playback error:", e);
          URL.revokeObjectURL(audioSrc);
          resumeListening();
        };

        await audio.play();
      } catch (err) {
        console.error("Audio playback error:", err);
        resumeListening();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedVoice, resumeListening, stopAgentAudio]
  );

  // Handle Incoming User Voice Input and Query LLM
  const handleUserSpokenInput = useCallback(
    async (text: string) => {
      if (!text || !text.trim()) {
        resumeListening();
        return;
      }

      const cleanInp = text.trim();
      const userMsg: Message = {
        id: `usr_${Date.now()}`,
        sender: "user",
        text: cleanInp,
        timestamp: new Date().toLocaleTimeString("ar-SA", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setLiveCaption(`أنت: "${cleanInp}"`);
      const currentHist = [...history, { role: "user" as const, content: cleanInp }];
      setHistory(currentHist);

      setAgentState("thinking");
      stopAgentAudio();

      try {
        const callerCtx = crmRecord?.found
          ? `اسم المتصل: ${crmRecord.name} | رقم الهاتف: ${callerPhone} | التذكرة: ${crmRecord.open_inquiry || "لا يوجد"}`
          : callerPhone
          ? `رقم المتصل: ${callerPhone} (عميل جديد)`
          : "";

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: cleanInp,
            text: cleanInp,
            sector: activeMode,
            caller_phone: callerPhone,
            caller_name: crmRecord?.name || "",
            caller_context: callerCtx,
            custom_name: customCompanyName,
            custom_faq: customFaqText,
            history: currentHist.slice(-8),
            agent_name: currentPersona.name,
            voice: selectedVoice,
            dialect: "najdi",
          }),
        });

        if (!res.ok) throw new Error("Voice chat API failed");
        const data = await res.json();
        const reply = data.reply?.trim() || "";

        const agentMsg: Message = {
          id: `agt_${Date.now()}`,
          sender: "agent",
          text: reply,
          timestamp: new Date().toLocaleTimeString("ar-SA", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        setMessages((prev) => [...prev, agentMsg]);
        setHistory((prev) => [...prev, { role: "assistant" as const, content: reply }]);

        // Play authentic Saudi Gemini Voice
        await playAgentAudio(reply);
      } catch (err) {
        console.error("Agent reply failed:", err);
        const fallback = "أبشر بسعدك يا غالي، ثواني بس وبكون معك على الخط فوراً.";
        await playAgentAudio(fallback);
      }
    },
    [
      history,
      crmRecord,
      callerPhone,
      activeMode,
      customCompanyName,
      customFaqText,
      currentPersona.name,
      selectedVoice,
      playAgentAudio,
      resumeListening,
      stopAgentAudio,
    ]
  );

  // START CALL
  const handleStartCall = async (initialQuery?: string) => {
    try {
      setCallActive(true);
      setShowSummary(false);
      setMessages([]);
      setHistory([]);
      setCallDuration(0);
      hasSpokenGreetingRef.current = false;

      // Start duration timer
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      // Initialize Mic Recorder with instant sub-second VAD
      const rec = new AudioRecorder({
        onVolumeChange: (vol: number) => {
          setVolumeLevel(vol);
        },
        onSpeechStart: () => {
          setAgentState("recording");
        },
        onSpeechEnd: async (wavBlob: Blob) => {
          if (!wavBlob || wavBlob.size < 400) {
            resumeListening();
            return;
          }
          try {
            setAgentState("thinking");
            const formData = new FormData();
            formData.append("audio", wavBlob, "speech.wav");
            const sttRes = await fetch("/api/stt", {
              method: "POST",
              body: formData,
            });
            if (sttRes.ok) {
              const d = await sttRes.json();
              const transcript = (d.text || d.transcript || "").trim();
              const hasArabicLetters =
                Boolean(transcript) &&
                /[\u0600-\u06FF]/.test(transcript) &&
                transcript !== "00:00" &&
                !transcript.startsWith("[");
              if (hasArabicLetters) {
                handleUserSpokenInput(transcript);
              } else {
                resumeListening();
              }
            } else {
              resumeListening();
            }
          } catch (e) {
            console.warn("STT error:", e);
            resumeListening();
          }
        },
      });

      await rec.init();
      rec.startListeningTurn();
      audioRecorderRef.current = rec;

      // Initial Greeting
      if (initialQuery && initialQuery.trim()) {
        setTimeout(() => {
          handleUserSpokenInput(initialQuery);
        }, 300);
      } else {
        const greetingText =
          crmRecord?.found && crmRecord.name
            ? `يا هلا والله بأخوي ${crmRecord.name}، نورتنا! شفت موضوع ${crmRecord.open_inquiry || "طلبك"}، أبشر بسعدك الحين أشوف لك إياه وأحله فوراً.`
            : currentPersona.greeting;

        const greetMsg: Message = {
          id: `greet_${Date.now()}`,
          sender: "agent",
          text: greetingText,
          timestamp: new Date().toLocaleTimeString("ar-SA", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        setMessages([greetMsg]);
        setHistory([{ role: "assistant", content: greetingText }]);

        setTimeout(() => {
          playAgentAudio(greetingText);
        }, 200);
      }
    } catch (err) {
      console.error("Start call failed:", err);
      alert("يرجى السماح بالوصول إلى المايكروفون لبدء المكالمة الصوتية.");
      setCallActive(false);
    }
  };

  // END CALL
  const handleEndCall = async () => {
    setCallActive(false);
    setAgentState("idle");
    stopAgentAudio();

    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    if (audioRecorderRef.current) {
      try {
        audioRecorderRef.current.close();
      } catch (e) {
        console.warn("Stop recorder error:", e);
      }
      audioRecorderRef.current = null;
    }

    // Capture Universal Lead
    const callerName = crmRecord?.found ? crmRecord.name || "أبو فهد" : "متصل جديد";
    const lastUserTurn = [...messages].reverse().find((m) => m.sender === "user");
    const inquiry =
      lastUserTurn?.text ||
      crmRecord?.open_inquiry ||
      "استفسار عام عبر المكالمة الصوتية";

    const isAngry = messages.some((m) =>
      /غضب|زعلان|سيء|تأخير|مشرف|مدير|شكوى/.test(m.text)
    );
    const sentiment = isAngry ? "Frustrated" : "Positive";

    const leadData = {
      caller_phone: callerPhone || "0501234567",
      caller_name: callerName,
      company_id: customCompanyName,
      inquiry_summary: inquiry,
      customer_sentiment: sentiment,
      call_duration_seconds: callDuration || 35,
      requires_human_followup: isAngry,
      timestamp: new Date().toISOString(),
    };

    try {
      await fetch("/api/call-end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadData),
      });
    } catch (e) {
      console.warn("Capture lead failed:", e);
    }

    setCapturedLeadSummary({
      inquiry,
      sentiment,
      callerName,
      phone: callerPhone || "0501234567",
      duration: callDuration,
      requiresFollowup: isAngry,
    });
    setShowSummary(true);
    setLiveCaption(currentPersona.greeting);
  };

  // Central Orb Click (Instant Interrupt / Push-to-Send)
  const handleOrbClick = () => {
    if (!callActive) {
      handleStartCall();
      return;
    }
    if (agentState === "speaking") {
      stopAgentAudio();
      resumeListening();
    } else if (agentState === "recording" || agentState === "listening") {
      if (audioRecorderRef.current) {
        audioRecorderRef.current.forceDispatch();
      }
    }
  };

  // WhatsApp share link
  const getWhatsAppLink = () => {
    if (!capturedLeadSummary) return "#";
    const text = `*ملخص مكالمة خدمة العملاء الذكية — LevelLM*\n\nالمنشأة: ${customCompanyName}\nالمتصل: ${capturedLeadSummary.callerName} (${capturedLeadSummary.phone})\nالمساعد: ${currentPersona.name} (${currentPersona.tone})\nمدة المكالمة: ${formatDuration(capturedLeadSummary.duration)}\nالحالة: ${capturedLeadSummary.sentiment === "Frustrated" ? "⚠️ تطلب تصعيد للمشرف" : "✅ استفسار ناجح"}\nالملخص: ${capturedLeadSummary.inquiry}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  // Soundwave visualization heights
  const getSoundwaveHeights = () => {
    if (agentState === "speaking") {
      return [45, 75, 95, 100, 85, 95, 70, 85, 95, 60, 40];
    }
    if (agentState === "recording") {
      const v = Math.max(volumeLevel, 0.35);
      return [
        Math.min(95, Math.round(25 + v * 65)),
        Math.min(100, Math.round(40 + v * 75)),
        Math.min(100, Math.round(55 + v * 85)),
        Math.min(100, Math.round(75 + v * 95)),
        Math.min(100, Math.round(60 + v * 85)),
        Math.min(100, Math.round(80 + v * 98)),
        Math.min(95, Math.round(50 + v * 75)),
        Math.min(90, Math.round(40 + v * 70)),
        Math.min(98, Math.round(65 + v * 85)),
        Math.min(85, Math.round(45 + v * 65)),
        Math.min(75, Math.round(30 + v * 55)),
      ];
    }
    if (agentState === "thinking") {
      return [25, 38, 52, 68, 58, 65, 50, 38, 28, 20, 15];
    }
    return [18, 30, 42, 55, 65, 58, 45, 35, 26, 20, 15];
  };

  const soundwaveHeights = getSoundwaveHeights();

  return (
    <div className="flex flex-col h-[calc(100vh-55px)] max-w-5xl mx-auto w-full px-3 sm:px-6 relative text-slate-800">
      {/* ── 1. EXECUTIVE TOP BAR (BRAND & CONTROLS) ── */}
      <header className="py-3 px-3 sm:px-5 flex items-center justify-between border border-slate-200/80 bg-white/90 backdrop-blur-md rounded-2xl shadow-xs mt-2 mb-3">
        {/* Brand Presence */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shadow-md shadow-emerald-600/20 ring-1 ring-emerald-500/30">
            <Radio className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                LevelLM <span className="text-emerald-700 font-semibold">Voice AI</span>
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200/90 px-2.5 py-0.5 rounded-full font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                صوتي مباشر
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block font-medium">
              المنصة الصوتية الذكية للمنشآت • المملكة العربية السعودية
            </p>
          </div>
        </div>

        {/* Right Controls: Persona Switcher & Drawer Trigger */}
        <div className="flex items-center gap-2">
          {/* Persona Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              disabled={callActive}
              className="text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-full px-3.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer transition-colors disabled:opacity-50"
              title="تغيير شخصية ونبرة المساعد الصوتي"
            >
              <option value="Charon" className="bg-white text-slate-900">
                🎙️ سعود (لهجة نجدية وقورة)
              </option>
              <option value="Fenrir" className="bg-white text-slate-900">
                🎙️ فيصل (نبرة واثقة متزنة)
              </option>
              <option value="Aoede" className="bg-white text-slate-900">
                🎙️ سارة (صوت نسائي راقي)
              </option>
            </select>
          </div>

          {/* Transcript / Sonic View Toggle */}
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              showTranscript
                ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
            title="التبديل بين الواجهة الصوتية والنص"
          >
            {showTranscript ? (
              <>
                <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span className="hidden sm:inline">الواجهة الصوتية</span>
              </>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">سجل المحادثة</span>
                {messages.length > 0 && (
                  <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {messages.length}
                  </span>
                )}
              </>
            )}
          </button>

          {/* Enterprise Settings & CRM Drawer Trigger */}
          <button
            onClick={() => setShowSettingsDrawer(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors shadow-2xs"
            title="إعدادات المنشأة ومحاكاة المتصل"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline">
              {crmRecord?.found && crmRecord.name
                ? `المتصل: ${crmRecord.name}`
                : "إعدادات المنشأة"}
            </span>
          </button>
        </div>
      </header>

      {/* ── 2. MAIN STAGE (HERO PERSONA & CHARISMATIC LIVING VISUALIZER) ── */}
      {!showTranscript ? (
        <div className="flex-1 flex flex-col items-center justify-center py-2 relative select-none">
          {/* Persona Profile Header */}
          <div className="text-center mb-3 max-w-md animate-in fade-in duration-300">
            {/* Live Status Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/90 text-xs font-semibold text-slate-700 mb-2.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{customCompanyName}</span>
              <span className="text-slate-300">•</span>
              <span className="text-emerald-700 font-bold">{currentPersona.name}</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              المستشار الصوتي التفاعلي
            </h2>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              {currentPersona.description}
            </p>
          </div>

          {/* Living Charismatic Sonic Orb (Light Canvas Aesthetics) */}
          <div className="relative my-3 flex items-center justify-center w-full max-w-sm h-52">
            {/* Ambient Radial Aura Pulse */}
            <div
              style={{
                background:
                  agentState === "speaking"
                    ? "rgba(16, 185, 129, 0.22)"
                    : agentState === "recording"
                    ? "rgba(20, 184, 166, 0.25)"
                    : agentState === "thinking"
                    ? "rgba(245, 158, 11, 0.18)"
                    : "rgba(16, 185, 129, 0.12)",
              }}
              className={`absolute w-64 h-64 rounded-full transition-all duration-700 pointer-events-none blur-3xl ${
                agentState === "speaking"
                  ? "scale-135 opacity-90 speaking-pulse-active"
                  : agentState === "recording"
                  ? "scale-140 opacity-95 animate-pulse"
                  : agentState === "thinking"
                  ? "scale-115 opacity-80 animate-pulse"
                  : "scale-100 opacity-60 persona-aura-pulse"
              }`}
            />

            {/* Glowing Rings (Apple / Gemini Live Clean Light Aesthetic) */}
            <div
              className={`absolute w-44 h-44 rounded-full border transition-all duration-500 pointer-events-none ${
                agentState === "speaking"
                  ? "border-emerald-400/80 scale-110 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-300/40"
                  : agentState === "recording"
                  ? "border-teal-400/80 scale-115 shadow-lg shadow-teal-500/20 ring-2 ring-teal-300/40"
                  : agentState === "thinking"
                  ? "border-amber-400/80 scale-105 animate-spin ring-1 ring-amber-300/30"
                  : "border-slate-200/90 scale-100 shadow-xs"
              }`}
            />

            {/* Central Living Sonic Core */}
            <div
              onClick={handleOrbClick}
              className={`relative z-10 w-36 h-36 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 shadow-xl backdrop-blur-xl ${
                agentState === "speaking"
                  ? "bg-gradient-to-b from-white via-emerald-50 to-emerald-100/60 ring-3 ring-emerald-500 shadow-emerald-600/25 scale-105"
                  : agentState === "recording"
                  ? "bg-gradient-to-b from-white via-teal-50 to-teal-100/60 ring-3 ring-teal-500 shadow-teal-600/25 scale-105"
                  : agentState === "thinking"
                  ? "bg-gradient-to-b from-white via-amber-50 to-amber-100/60 ring-3 ring-amber-400 shadow-amber-500/20"
                  : "bg-gradient-to-b from-white to-slate-50 border border-slate-200/90 ring-1 ring-emerald-400/30 hover:ring-emerald-500/60 hover:scale-102"
              }`}
            >
              {/* Fluid Soundwave Equalizer Bars */}
              <div className="flex items-center justify-center gap-1.5 h-16 px-4">
                {soundwaveHeights.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      height: `${h}%`,
                      transition:
                        agentState === "recording"
                          ? "height 70ms ease-out"
                          : "height 240ms ease-in-out",
                    }}
                    className={`w-1.5 rounded-full transition-all ${
                      agentState === "speaking"
                        ? "bg-gradient-to-t from-emerald-600 via-teal-500 to-emerald-400 shadow-xs shadow-emerald-500/40"
                        : agentState === "recording"
                        ? "bg-gradient-to-t from-teal-600 to-teal-400 shadow-xs"
                        : agentState === "thinking"
                        ? "bg-gradient-to-t from-amber-500 to-amber-300"
                        : "bg-gradient-to-t from-emerald-600 to-teal-500"
                    }`}
                  />
                ))}
              </div>

              {/* Core State Pill Icon */}
              <div className="mt-1">
                {agentState === "thinking" ? (
                  <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                ) : agentState === "speaking" ? (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                ) : agentState === "recording" ? (
                  <Zap className="w-3.5 h-3.5 text-teal-600" />
                ) : (
                  <Headphones className="w-3.5 h-3.5 text-emerald-700" />
                )}
              </div>
            </div>
          </div>

          {/* Real-time Spoken Caption Subtitle */}
          <div className="max-w-lg w-full text-center px-4 min-h-[56px] flex items-center justify-center my-2">
            <div className="inline-block px-5 py-3 rounded-2xl bg-white/95 border border-slate-200/90 shadow-md text-slate-800 text-xs sm:text-sm leading-relaxed transition-all duration-300 font-medium">
              <span className="text-emerald-700 font-extrabold ml-1.5">
                {agentState === "speaking"
                  ? `${currentPersona.name}: `
                  : agentState === "recording"
                  ? "يستمع لك الآن... "
                  : agentState === "thinking"
                  ? "يفكر ويجهز الإجابة... "
                  : ""}
              </span>
              <span>{liveCaption}</span>
            </div>
          </div>

          {/* Primary Action Button or In-Call Dock */}
          <div className="mt-3 mb-2">
            {!callActive ? (
              <button
                onClick={() => handleStartCall()}
                className="group relative flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-emerald-700/25 transition-all hover:shadow-emerald-600/40 ring-2 ring-emerald-500/25"
              >
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-white" />
                </div>
                <span>بدء المحادثة الصوتية مع {currentPersona.name}</span>
                <span className="w-2 h-2 rounded-full bg-white animate-ping ml-1" />
              </button>
            ) : (
              /* IN-CALL CONTROLS DOCK */
              <div className="flex items-center gap-4 bg-white border border-slate-200/90 px-5 py-3 rounded-full shadow-xl">
                {/* Mute Mic */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-3 rounded-full transition-all ${
                    isMuted
                      ? "bg-amber-100 text-amber-700 ring-2 ring-amber-400"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80"
                  }`}
                  title={isMuted ? "إلغاء كتم المايك" : "كتم المايك"}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                {/* Duration Capsule */}
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  <span>{formatDuration(callDuration)}</span>
                </div>

                {/* End Call */}
                <button
                  onClick={handleEndCall}
                  className="p-3 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 ring-1 ring-rose-200 transition-colors shadow-xs"
                  title="إنهاء المكالمة"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Quick-Prompt Suggestions (Only shown when call is idle) */}
          {!callActive && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 max-w-xl px-2">
              {SUGGESTED_INQUIRIES.map((sq, i) => (
                <button
                  key={i}
                  onClick={() => handleStartCall(sq.text)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 hover:border-emerald-500/50 transition-all shadow-2xs"
                >
                  {sq.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── 3. WRITTEN TRANSCRIPT VIEW ── */
        <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 space-y-3.5 my-2">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20 text-slate-400">
              <FileText className="w-12 h-12 mb-3 stroke-1 text-slate-300" />
              <p className="text-sm font-bold text-slate-700">
                لا توجد رسائل مسجلة حتى الآن
              </p>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                تحدث صوتياً مع {currentPersona.name} لتظهر النصوص فوراً
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isUser = m.sender === "user";
              return (
                <div
                  key={m.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"} animate-in fade-in duration-200`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5 shadow-xs">
                      <Headphones className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? "bg-emerald-600 text-white rounded-tr-xs shadow-md shadow-emerald-700/20 font-medium"
                        : "bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs shadow-xs font-medium"
                    }`}
                  >
                    <p>{m.text}</p>
                    <p className={`text-[10px] mt-1 text-right font-mono ${isUser ? "text-emerald-100" : "text-slate-400"}`}>
                      {m.timestamp}
                    </p>
                  </div>
                  {isUser && (
                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 ml-2 mt-0.5 shadow-2xs">
                      <User className="w-4 h-4 text-slate-600" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {agentState === "thinking" && (
            <div className="flex justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                <Headphones className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-xs shadow-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* ── 4. POST-CALL EXECUTIVE SUMMARY CARD ── */}
      {showSummary && capturedLeadSummary && (
        <div className="mb-3 bg-white rounded-2xl border border-emerald-200 p-4 shadow-xl animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-extrabold text-sm text-slate-900">
                تقرير المكالمة الصوتي المعتمد (Universal Lead)
              </span>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  capturedLeadSummary.sentiment === "Frustrated"
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                }`}
              >
                {capturedLeadSummary.sentiment === "Frustrated"
                  ? "انزعاج / تم التحويل للمشرف"
                  : "إيجابي / استفسار ناجح"}
              </span>
            </div>
            <button
              onClick={() => setShowSummary(false)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
              <span className="text-slate-500 block text-[10px] font-medium">المتصل والمنشأة:</span>
              <span className="font-bold text-slate-800">
                {capturedLeadSummary.callerName} ({capturedLeadSummary.phone})
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 sm:col-span-2">
              <span className="text-slate-500 block text-[10px] font-medium">ملخص الاستفسار:</span>
              <span className="font-bold text-slate-800 truncate block">
                {capturedLeadSummary.inquiry}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <a
              href={getWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              <span>مشاركة تقرير المكالمة عبر الواتساب</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>
            <button
              onClick={() => {
                setShowSummary(false);
                handleStartCall();
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>مكالمة جديدة</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 5. BOTTOM TEXT FALLBACK INPUT (WHEN NOT IN CALL) ── */}
      {!callActive && (
        <div className="pb-3 pt-1 border-t border-slate-200/80">
          <div className="flex items-center gap-2 max-w-2xl mx-auto w-full">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && textInput.trim()) {
                  const q = textInput.trim();
                  setTextInput("");
                  handleStartCall(q);
                }
              }}
              placeholder={`أو اكتب استفسارك لـ ${currentPersona.name} هنا بالضغط على Enter...`}
              className="flex-1 bg-white border border-slate-200/90 rounded-full px-5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs font-medium"
            />
            {textInput.trim() ? (
              <button
                onClick={() => {
                  const q = textInput.trim();
                  setTextInput("");
                  handleStartCall(q);
                }}
                className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full transition-colors shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* ── 6. ENTERPRISE SETTINGS & CRM SLIDE-OVER DRAWER ── */}
      {showSettingsDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white border-r border-slate-200 w-full max-w-md h-full p-6 flex flex-col justify-between overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-200">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <div className="flex items-center gap-2.5">
                  <SlidersHorizontal className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-black text-slate-900 text-base">
                    إعدادات المنشأة ومحاكاة المتصل
                  </h3>
                </div>
                <button
                  onClick={() => setShowSettingsDrawer(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 1. Caller ID & CRM Simulation */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  محاكاة رقم المتصل (Caller ID & CRM Recognition):
                </label>
                <div className="space-y-1.5">
                  {CRM_PRESETS.map((p) => {
                    const isSelected = callerPhone === p.phone;
                    return (
                      <button
                        key={p.label}
                        onClick={() => handlePhoneLookup(p.phone)}
                        className={`w-full text-right px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-emerald-50 border border-emerald-300 text-emerald-950 font-bold shadow-2xs"
                            : "bg-slate-50 border border-slate-200/80 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span>{p.label}</span>
                        {isSelected && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                            مفعل
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* CRM Status Preview */}
                <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                  <div className="text-[10px] text-slate-500 mb-1 font-medium">حالة المتصل في النظام:</div>
                  {isLookingUpCrm ? (
                    <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                      جاري فحص الـ CRM...
                    </span>
                  ) : crmRecord?.found ? (
                    <div className="text-emerald-700 font-bold">
                      ✓ مسجل: {crmRecord.name} ({crmRecord.open_inquiry || "عميل VIP"})
                    </div>
                  ) : (
                    <div className="text-slate-500 font-medium">متصل جديد غير مسجل في السجل (مكالمة عامة حرة)</div>
                  )}
                </div>
              </div>

              {/* 2. Enterprise Identity & Dynamic Ingestion */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    اسم المنشأة أو الشركة:
                  </label>
                  <input
                    type="text"
                    value={customCompanyName}
                    onChange={(e) => setCustomCompanyName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white font-medium"
                    placeholder="مثال: شركة ليفل القابضة، عيادات الرياض..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    قاعدة بيانات وسياق المنشأة (خدمات، أسعار، سياسات):
                  </label>
                  <textarea
                    rows={5}
                    value={customFaqText}
                    onChange={(e) => setCustomFaqText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white leading-relaxed font-medium"
                    placeholder="اختياري: الصق هنا معلومات منشأتك لتخصيص الإجابات الرسمية..."
                  />
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="pt-4 border-t border-slate-100 mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowSettingsDrawer(false)}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-700/20 transition-colors"
              >
                تطبيق الإعدادات والعودة للمحادثة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
