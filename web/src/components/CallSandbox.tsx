"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Phone, PhoneOff, Mic, MicOff, Volume2,
  Activity, Clock, Zap, Send, Radio, RefreshCw, VolumeX, Square,
  Building2, Car, Package, Settings2, Plus, ExternalLink,
  MessageCircle, Smartphone, CheckCircle2, ChevronDown,
  Info, ShieldCheck, MapPin, Calendar, Tag, ArrowRight,
  Share2, Edit3, X, HelpCircle,
} from "lucide-react";
import { AudioVisualizer } from "./AudioVisualizer";

// Types
export type SectorType = "real_estate" | "car_rental" | "logistics" | "custom";

interface Message {
  id: string;
  sender: "user" | "agent";
  text: string;
  timestamp: string;
  latencyMs?: number;
}

interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

interface CallSandboxProps {
  currentDialect: string;
  onDialectChange: (dialect: string) => void;
  systemPrompt?: string;
}

export const CallSandbox: React.FC<CallSandboxProps> = ({
  currentDialect,
  onDialectChange,
}) => {
  // Sector & Preset State
  const [activeSector, setActiveSector] = useState<SectorType>("real_estate");
  const [catalogData, setCatalogData] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [showNgrokModal, setShowNgrokModal] = useState(false);
  const [customCompanyName, setCustomCompanyName] = useState("مكتب الشموخ للمحاماة");
  const [customFaqText, setCustomFaqText] = useState(
    "نقدم استشارات قانونية وتوثيق عقود للشركات بالرياض. ساعات العمل من 9ص إلى 5م. رسوم الاستشارة 500 ريال."
  );

  // Call Engine State
  const [callActive, setCallActive] = useState(false);
  const [agentState, setAgentState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isHandsFree, setIsHandsFree] = useState(true);
  const [isManualRecording, setIsManualRecording] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  const [currentLatency, setCurrentLatency] = useState(240);
  const [inputText, setInputText] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [volumeLevel, setVolumeLevel] = useState(0.2);
  const [userIsSpeaking, setUserIsSpeaking] = useState(false);

  // Post-Call Action Summary State
  const [lastCallOutcome, setLastCallOutcome] = useState<{
    type: SectorType;
    title: string;
    clientName: string;
    detail: string;
    actionNote: string;
    whatsappText: string;
  } | null>(null);

  // Refs for audio pipeline
  const transcriptBottomRef = useRef<HTMLDivElement | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadAnimationIdRef = useRef<number | null>(null);

  // Pre-roll rolling audio buffer
  const preRollChunksRef = useRef<Blob[]>([]);
  const speechChunksRef = useRef<Blob[]>([]);

  // Async state synchronization refs
  const callActiveRef = useRef(false);
  const isMutedRef = useRef(false);
  const isProcessingRef = useRef(false);
  const agentStateRef = useRef<"idle" | "listening" | "thinking" | "speaking">("idle");
  const isHandsFreeRef = useRef(true);
  const isManualRecordingRef = useRef(false);
  const activeSectorRef = useRef<SectorType>("real_estate");

  // VAD timing
  const hasSpokenRef = useRef(false);
  const speechStartRef = useRef(0);
  const lastSpeechTimeRef = useRef(0);

  useEffect(() => { callActiveRef.current = callActive; }, [callActive]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { agentStateRef.current = agentState; }, [agentState]);
  useEffect(() => { isHandsFreeRef.current = isHandsFree; }, [isHandsFree]);
  useEffect(() => { isManualRecordingRef.current = isManualRecording; }, [isManualRecording]);
  useEffect(() => { activeSectorRef.current = activeSector; }, [activeSector]);

  // Fetch sector catalog on mount or sector change
  const fetchCatalog = useCallback(async (sector: SectorType) => {
    try {
      const res = await fetch(`/api/catalog?sector=${sector}`);
      if (res.ok) {
        const data = await res.json();
        setCatalogData(data);
        if (sector === "custom" && data) {
          if (data.company_name) setCustomCompanyName(data.company_name);
          if (data.faq_text) setCustomFaqText(data.faq_text);
        }
      }
    } catch (e) {
      console.error("Failed to load catalog:", e);
    }
  }, []);

  useEffect(() => {
    fetchCatalog(activeSector);
  }, [activeSector, fetchCatalog]);

  // Scroll transcript
  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, agentState, userIsSpeaking]);

  // Call timer
  useEffect(() => {
    if (!callActive) return;
    const t = setInterval(() => setCallDuration((p) => p + 1), 1000);
    return () => clearInterval(t);
  }, [callActive]);

  const formatDuration = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ─────────────────────────────────────────────
  // SPEAK: Play AI Voice (Google Gemini Saud)
  // ─────────────────────────────────────────────
  const speakAudio = useCallback(async (text: string) => {
    if (isMutedRef.current || !callActiveRef.current) return;

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.src = "";
      audioPlayerRef.current = null;
    }

    setAgentState("speaking");
    setStatusMsg("سعود يتحدث معك الآن 🔊");
    isProcessingRef.current = true;

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioPlayerRef.current = audio;
      // Mobile Safari / Chrome inline audio playback
      audio.setAttribute("playsinline", "true");
      (audio as unknown as { playsInline?: boolean }).playsInline = true;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        audioPlayerRef.current = null;
        isProcessingRef.current = false;

        if (callActiveRef.current) {
          setTimeout(() => {
            startListeningTurn();
          }, 200);
        }
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        audioPlayerRef.current = null;
        isProcessingRef.current = false;
        if (callActiveRef.current) {
          startListeningTurn();
        }
      };

      await audio.play();
    } catch (err) {
      console.error("Audio playback error:", err);
      isProcessingRef.current = false;
      if (callActiveRef.current) {
        startListeningTurn();
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────
  // PROCESS AUDIO SLICE THROUGH /api/voice-chat
  // ─────────────────────────────────────────────
  const processAudioSlice = useCallback(async (audioBlob: Blob) => {
    if (isProcessingRef.current || !callActiveRef.current) return;

    if (audioBlob.size < 1200) {
      if (callActiveRef.current) startListeningTurn();
      return;
    }

    isProcessingRef.current = true;
    setAgentState("thinking");
    setStatusMsg("سند يحلل صوتك ويجهز الرد... 🧠");
    setUserIsSpeaking(false);
    setIsManualRecording(false);

    const tStart = Date.now();

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "user_speech.webm");
      formData.append("dialect", currentDialect);
      formData.append("sector", activeSectorRef.current);
      formData.append("custom_name", customCompanyName);
      formData.append("custom_faq", customFaqText);

      let currentHist: ConversationTurn[] = [];
      setHistory((prev) => { currentHist = prev; return prev; });
      formData.append("history", JSON.stringify(currentHist.slice(-8)));

      const res = await fetch("/api/voice-chat", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const transcript = data.transcript?.trim() || "";
      const reply = data.reply?.trim() || "";
      const latency = Date.now() - tStart;
      setCurrentLatency(latency);

      if (data.silent || !transcript) {
        isProcessingRef.current = false;
        if (callActiveRef.current) startListeningTurn();
        return;
      }

      const ts = new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });

      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, sender: "user", text: transcript, timestamp: ts },
        { id: `a-${Date.now() + 1}`, sender: "agent", text: reply, timestamp: ts, latencyMs: latency },
      ]);

      setHistory((prev) => [
        ...prev,
        { role: "user", content: transcript },
        { role: "assistant", content: reply },
      ]);

      // Play audio reply
      await speakAudio(reply);

    } catch (err) {
      console.error("Voice chat error:", err);
      isProcessingRef.current = false;
      if (callActiveRef.current) startListeningTurn();
    }
  }, [currentDialect, customCompanyName, customFaqText, speakAudio]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────
  // START LISTENING TURN (Pre-roll buffer)
  // ─────────────────────────────────────────────
  const startListeningTurn = useCallback(() => {
    if (!callActiveRef.current || isProcessingRef.current) return;
    if (!mediaStreamRef.current) return;

    hasSpokenRef.current = false;
    speechStartRef.current = 0;
    lastSpeechTimeRef.current = 0;
    preRollChunksRef.current = [];
    speechChunksRef.current = [];
    setUserIsSpeaking(false);
    setIsManualRecording(false);
    setAgentState("listening");

    if (isHandsFreeRef.current) {
      setStatusMsg("سند يستمع إليك... تكلم بحرية 🎤");
    } else {
      setStatusMsg("انقر على الزر للبدء في التحدث 👆");
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch (e) { /* ignore */ }
    }

    try {
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";

      const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          if (!hasSpokenRef.current && !isManualRecordingRef.current) {
            preRollChunksRef.current.push(e.data);
            if (preRollChunksRef.current.length > 2) {
              preRollChunksRef.current.shift();
            }
          } else {
            if (speechChunksRef.current.length === 0 && preRollChunksRef.current.length > 0) {
              speechChunksRef.current.push(...preRollChunksRef.current);
            }
            speechChunksRef.current.push(e.data);
          }
        }
      };

      recorder.onstop = () => {
        const chunksToSend = speechChunksRef.current.length > 0
          ? speechChunksRef.current
          : preRollChunksRef.current;
        const audioBlob = new Blob(chunksToSend, { type: mimeType });
        speechChunksRef.current = [];
        preRollChunksRef.current = [];
        processAudioSlice(audioBlob);
      };

      recorder.start(250);
    } catch (err) {
      console.error("Failed to start MediaRecorder turn:", err);
    }
  }, [processAudioSlice]);

  // ─────────────────────────────────────────────
  // STOP CURRENT TURN AND DISPATCH
  // ─────────────────────────────────────────────
  const stopTurnAndDispatch = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error("Error stopping recorder:", err);
      }
    }
    setUserIsSpeaking(false);
    setIsManualRecording(false);
  }, []);

  // ─────────────────────────────────────────────
  // VAD ENGINE (Time-Domain RMS with Adaptive Threshold)
  // ─────────────────────────────────────────────
  const setupVAD = useCallback((stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext; // eslint-disable-line @typescript-eslint/no-explicit-any
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.fftSize);

      const checkVolume = () => {
        if (!callActiveRef.current) return;

        if (agentStateRef.current === "listening" && !isProcessingRef.current) {
          analyser.getByteTimeDomainData(dataArray);

          let sumSquares = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const normalized = (dataArray[i] - 128) / 128;
            sumSquares += normalized * normalized;
          }
          const rms = Math.sqrt(sumSquares / dataArray.length);

          const dynamicVol = Math.min(Math.max(rms * 5.0, 0.15), 1.0);
          setVolumeLevel(dynamicVol);

          if (isHandsFreeRef.current) {
            const SPEECH_THRESHOLD = 0.026;
            const now = Date.now();

            if (rms > SPEECH_THRESHOLD) {
              if (!hasSpokenRef.current) {
                hasSpokenRef.current = true;
                speechStartRef.current = now;
              }
              lastSpeechTimeRef.current = now;
              setUserIsSpeaking(true);
              setStatusMsg("سند يستمع لصوتك الآن... 🟢");
            } else {
              if (hasSpokenRef.current) {
                const speechDuration = now - speechStartRef.current;
                const silenceDuration = now - lastSpeechTimeRef.current;

                if (speechDuration > 400 && silenceDuration > 1750) {
                  hasSpokenRef.current = false;
                  stopTurnAndDispatch();
                }
              } else {
                setUserIsSpeaking(false);
              }
            }
          }
        } else {
          setVolumeLevel(0.15);
        }

        vadAnimationIdRef.current = requestAnimationFrame(checkVolume);
      };

      vadAnimationIdRef.current = requestAnimationFrame(checkVolume);
    } catch (err) {
      console.error("VAD initialization error:", err);
    }
  }, [stopTurnAndDispatch]);

  // ─────────────────────────────────────────────
  // START CALL (Unlock Mobile Audio + Greeting)
  // ─────────────────────────────────────────────
  const handleStartCall = async () => {
    try {
      setCallActive(true);
      setMessages([]);
      setHistory([]);
      setCallDuration(0);
      isProcessingRef.current = true;
      setStatusMsg("جاري الاتصال بالمساعد الذكي...");

      // Request High-Quality Mobile Audio
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      mediaStreamRef.current = stream;
      setupVAD(stream);

      // Determine sector greeting
      let greeting = "يا هلا والله ومسهلا! معك سند مستشارك العقاري الذكي. تبحث عن فيلا أو شقة للشراء أو الإيجار؟";
      if (activeSector === "car_rental") {
        greeting = "يا هلا والله! معك سند من خدمة تأجير السيارات. تبي تفحص سيارة متوفرة أو تحجز لرحلتك؟";
      } else if (activeSector === "logistics") {
        greeting = "يا هلا والله! معك سند مندوب تأكيد الشحنات. أقدر أساعدك في تأكيد موعد توصيل شحنتك أو تعديل العنوان؟";
      } else if (activeSector === "custom") {
        greeting = `يا هلا ومسهلا! معك سند المساعد الذكي لـ ${customCompanyName || "شركتكم"}. وش أقدر أخدمك فيه اليوم طال عمرك؟`;
      }

      const ts = new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
      setMessages([
        { id: "msg-0", sender: "agent", text: greeting, timestamp: ts, latencyMs: 120 },
      ]);
      setHistory([{ role: "assistant", content: greeting }]);

      await speakAudio(greeting);

    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error("Start call error:", err);
      setCallActive(false);
      isProcessingRef.current = false;
      alert("يرجى التأكد من السماح للمتصفح بالوصول إلى المايكرفون (عبر HTTPS في الجوال).");
    }
  };

  // ─────────────────────────────────────────────
  // END CALL & GENERATE POST-CALL LEAD CARD
  // ─────────────────────────────────────────────
  const handleEndCall = () => {
    if (vadAnimationIdRef.current) {
      cancelAnimationFrame(vadAnimationIdRef.current);
      vadAnimationIdRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch (e) { /* ignore */ }
    }
    mediaRecorderRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) { /* ignore */ }
      audioContextRef.current = null;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.src = "";
      audioPlayerRef.current = null;
    }

    isProcessingRef.current = false;
    hasSpokenRef.current = false;
    setCallActive(false);
    setAgentState("idle");
    setUserIsSpeaking(false);
    setIsManualRecording(false);
    setStatusMsg("");

    // Generate simulated smart outcome card based on active sector & messages
    if (messages.length >= 2) {
      if (activeSector === "real_estate") {
        setLastCallOutcome({
          type: "real_estate",
          title: "بطاقة عميل عقاري مميز (Hot Buyer Lead)",
          clientName: "أبو فهد — عميل مهتم بفيلا المرجان",
          detail: "ميزانية تقريبية: 3.8M ريال • جاهز للمعاينة يوم السبت • الدفع: كاش مع تمويل سكني",
          actionNote: "تم حجز موعد مبدئي وإرسال الكروكي عبر الواتساب",
          whatsappText: encodeURIComponent(
            "يا هلا أبو فهد، معك سند للاستشارات العقارية. بناءً على اتصالنا الهاتفي، نسعد بتأكيد موعد معاينة فيلا المرجان الفاخرة يوم السبت الساعة 4:30 عصراً. كروكي الموقع: https://maps.google.com"
          ),
        });
      } else if (activeSector === "car_rental") {
        setLastCallOutcome({
          type: "car_rental",
          title: "بطاقة حجز سيارة فوري (Car Reservation Card)",
          clientName: "سعد بن سلطان — حجز تويوتا كامري 2024",
          detail: "المدة: 3 أيام • فرع الاستلام: مطار الملك خالد الصالة 3 • السعر الإجمالي: 570 ريال",
          actionNote: "تم تسجيل الحجز المبدئي وإصدار رمز التأكيد #CR-4409",
          whatsappText: encodeURIComponent(
            "أهلاً أستاذ سعد، تم تأكيد حجزك لتويوتا كامري 2024 من فرع مطار الملك خالد الصالة 3. رمز الحجز #CR-4409. موقع الفرع: https://maps.google.com"
          ),
        });
      } else if (activeSector === "logistics") {
        setLastCallOutcome({
          type: "logistics",
          title: "تأكيد موعد توصيل الشحنة (Confirmed Delivery Card)",
          clientName: "أحمد الغامدي — شحنة #SA-88219",
          detail: "العنوان: حي المرجان • الوقت: الفترة المسائية (5م-8م) • الدفع عند الاستلام (COD): 320 ريال",
          actionNote: "المندوب سيتواصل قبل الوصول بـ 15 دقيقة",
          whatsappText: encodeURIComponent(
            "مرحباً أستاذ أحمد، معك مندوب منصة سند للتوصيل السريع. تم تأكيد تسليم شحنتك رقم #SA-88219 اليوم بين 5:00 و 8:00 مساءً. المبلغ المطلوب (COD): 320 ريال. رابط التتبع المباشر للمندوب: https://sanad.sa/track"
          ),
        });
      } else {
        setLastCallOutcome({
          type: "custom",
          title: `ملخص استفسار العميل لـ ${customCompanyName}`,
          clientName: "استفسار خدمة جديد (New Inquiry)",
          detail: "طلب تفاصيل الخدمة والأسعار المبدئية • العميل بانتظار التواصل",
          actionNote: "جاهز للمتابعة المباشرة عبر الواتساب بنقرة واحدة",
          whatsappText: encodeURIComponent(
            `يا هلا بك، معك فريق ${customCompanyName}. بناءً على اتصالك بنا، يسعدنا تزويدك بتفاصيل خدماتنا وعرض السعر المطلوب. يسعدنا الرد على أي استفسار!`
          ),
        });
      }
    }
  };

  // Central orb click handler
  const handleCenterAction = () => {
    if (!callActive) {
      handleStartCall();
      return;
    }

    if (agentState === "speaking" && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.src = "";
      audioPlayerRef.current = null;
      isProcessingRef.current = false;
      startListeningTurn();
      setStatusMsg("تمت المقاطعة. سند يستمع إليك الآن 🎤");
      return;
    }

    if (!hasSpokenRef.current && !isManualRecording) {
      hasSpokenRef.current = true;
      speechStartRef.current = Date.now();
      lastSpeechTimeRef.current = Date.now();
      setIsManualRecording(true);
      setUserIsSpeaking(true);
      setStatusMsg("جاري تسجيل صوتك الآن... تكلم براحتك ثم انقر للإرسال 🔴");
      return;
    }

    stopTurnAndDispatch();
  };

  // Text chat submission fallback
  const handleTextSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = inputText.trim();
    if (!query || isProcessingRef.current || !callActive) return;

    setInputText("");
    isProcessingRef.current = true;
    setAgentState("thinking");
    setStatusMsg("سند يفكر في ردك... 🧠");

    const ts = new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
    setMessages((p) => [...p, { id: `u-${Date.now()}`, sender: "user", text: query, timestamp: ts }]);

    const tStart = Date.now();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          dialect: currentDialect,
          sector: activeSector,
          custom_name: customCompanyName,
          custom_faq: customFaqText,
          history: history.slice(-8),
        }),
      });

      let reply = "أبشر بعزك! الحين أخدمك فيها.";
      if (res.ok) {
        const d = await res.json();
        if (d.reply) reply = d.reply;
      }

      const latency = Date.now() - tStart;
      setCurrentLatency(latency);

      setMessages((p) => [
        ...p,
        { id: `a-${Date.now()}`, sender: "agent", text: reply, timestamp: ts, latencyMs: latency },
      ]);

      setHistory((p) => [
        ...p,
        { role: "user", content: query },
        { role: "assistant", content: reply },
      ]);

      await speakAudio(reply);

    } catch (err) {
      console.error("Text chat error:", err);
      isProcessingRef.current = false;
      startListeningTurn();
    }
  };

  // Scenario quick questions click
  const handleScenarioClick = (text: string) => {
    setInputText(text);
    if (!callActive) {
      alert("اضغط على زر 'ابدأ المكالمة الصوتية' أولاً ثم اطرح سؤالك بصوتك أو بالنقر على السيناريو!");
    }
  };

  // Visual state pills
  const stateBadge = {
    idle: { text: "جاهز للمكالمة", color: "bg-slate-400" },
    listening: isManualRecording
      ? { text: "جاري تسجيل صوتك 🔴", color: "bg-rose-500 animate-pulse" }
      : userIsSpeaking
      ? { text: "سند يستمع إليك الآن 🟢", color: "bg-emerald-500 animate-ping" }
      : { text: isHandsFree ? "سند يسمعك (تكلم بحرية)" : "جاهز (انقر للتحدث)", color: "bg-emerald-600 animate-pulse" },
    thinking: { text: "سند يحلل الرد...", color: "bg-amber-500 animate-pulse" },
    speaking: { text: "سند يتحدث الآن 🔊", color: "bg-blue-600 animate-pulse" },
  }[agentState];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col gap-5">

      {/* ── 1. The 4-in-1 Engine: Apple-Style Segmented Pill Bar ── */}
      <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-2 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Preset Selector */}
        <div className="flex items-center overflow-x-auto w-full sm:w-auto p-1 bg-slate-100/80 rounded-xl gap-1 scrollbar-none">
          {[
            { id: "real_estate", label: "العقارات", icon: Building2, desc: "فلل المرجان وأبحر" },
            { id: "car_rental", label: "تأجير السيارات", icon: Car, desc: "الأسطول وفروع المطار" },
            { id: "logistics", label: "الشحن والتوصيل", icon: Package, desc: "تأكيد الشحنات و COD" },
            { id: "custom", label: "شركة مخصصة", icon: Settings2, desc: "أنشئ مساعدك في 60ث" },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeSector === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (callActive) {
                    if (confirm("تغيير القطاع سيقوم بإنهاء المكالمة الحالية لتحديث النظام. هل تود المتابعة؟")) {
                      handleEndCall();
                      setActiveSector(tab.id as SectorType);
                    }
                  } else {
                    setActiveSector(tab.id as SectorType);
                  }
                }}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-white text-emerald-800 shadow-sm border border-slate-200/80 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-emerald-700" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Action Controls: Catalog & Mobile Ngrok */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => setShowCatalogModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition-all shadow-xs"
          >
            <Tag className="w-3.5 h-3.5 text-emerald-700" />
            <span>كتالوج وبيانات القطاع</span>
          </button>

          <button
            onClick={() => setShowNgrokModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80 hover:bg-emerald-100/60 text-xs font-semibold text-emerald-800 transition-all shadow-xs"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
            <span>تجربة الجوال (Ngrok)</span>
          </button>
        </div>
      </div>

      {/* ── Demo Quick Scenario Pills ── */}
      <div className="w-full bg-slate-50 border border-slate-200/70 rounded-xl px-4 py-2.5 flex items-center gap-2 overflow-x-auto scrollbar-none text-xs">
        <span className="text-slate-500 font-semibold flex items-center gap-1 whitespace-nowrap">
          <Zap className="w-3.5 h-3.5 text-emerald-600" />
          سيناريوهات التجربة السريعة:
        </span>
        {activeSector === "real_estate" && (
          <>
            <button onClick={() => handleScenarioClick("كم سعر فيلا المرجان الفاخرة وما هي مساحتها؟")} className="px-3 py-1 bg-white border border-slate-200 rounded-full hover:border-emerald-500 text-slate-700 whitespace-nowrap shadow-xs">
              🏡 فيلا حي المرجان 3.85M
            </button>
            <button onClick={() => handleScenarioClick("عندكم شقة للإيجار بحي الروضة وكم إيجارها السنوي؟")} className="px-3 py-1 bg-white border border-slate-200 rounded-full hover:border-emerald-500 text-slate-700 whitespace-nowrap shadow-xs">
              🏢 شقة الروضة 85K/سنة
            </button>
            <button onClick={() => handleScenarioClick("أبي أحجز موعد معاينة لقصر أبحر الشمالية")} className="px-3 py-1 bg-white border border-slate-200 rounded-full hover:border-emerald-500 text-slate-700 whitespace-nowrap shadow-xs">
              📅 حجز موعد معاينة في أبحر
            </button>
          </>
        )}
        {activeSector === "car_rental" && (
          <>
            <button onClick={() => handleScenarioClick("أبي أعرف السيارات المتوفرة عندكم وأسعارها اليومية؟")} className="px-3 py-1 bg-white border border-slate-200 rounded-full hover:border-emerald-500 text-slate-700 whitespace-nowrap shadow-xs">
              🚗 فحص الأسطول المتاح
            </button>
            <button onClick={() => handleScenarioClick("هل الكامري متوفرة للتسليم في فرع المطار؟")} className="px-3 py-1 bg-white border border-slate-200 rounded-full hover:border-emerald-500 text-slate-700 whitespace-nowrap shadow-xs">
              ✈️ كامري فرع المطار 190 ر.س
            </button>
            <button onClick={() => handleScenarioClick("أبي سيارة عائلية كبيرة مثل يوكون كم سعرها؟")} className="px-3 py-1 bg-white border border-slate-200 rounded-full hover:border-emerald-500 text-slate-700 whitespace-nowrap shadow-xs">
              🚙 يوكون عائلي 450 ر.س
            </button>
          </>
        )}
        {activeSector === "logistics" && (
          <>
            <button onClick={() => handleScenarioClick("أبي أستفسر عن موعد شحنتي رقم SA-88219؟")} className="px-3 py-1 bg-white border border-slate-200 rounded-full hover:border-emerald-500 text-slate-700 whitespace-nowrap shadow-xs">
              📦 تتبع شحنة #SA-88219
            </button>
            <button onClick={() => handleScenarioClick("تأكيد التوصيل في الفترة المسائية بين 4 و 8 المساء")} className="px-3 py-1 bg-white border border-slate-200 rounded-full hover:border-emerald-500 text-slate-700 whitespace-nowrap shadow-xs">
              ⏰ تأكيد الفترة المسائية
            </button>
            <button onClick={() => handleScenarioClick("كم مبلغ الدفع عند الاستلام وهل المندوب معه جهاز مدى؟")} className="px-3 py-1 bg-white border border-slate-200 rounded-full hover:border-emerald-500 text-slate-700 whitespace-nowrap shadow-xs">
              💳 الدفع عند الاستلام (COD)
            </button>
          </>
        )}
        {activeSector === "custom" && (
          <>
            <button onClick={() => handleScenarioClick(`وش هي أبرز خدمات ${customCompanyName}؟`)} className="px-3 py-1 bg-white border border-slate-200 rounded-full hover:border-emerald-500 text-slate-700 whitespace-nowrap shadow-xs">
              💼 أبرز الخدمات
            </button>
            <button onClick={() => handleScenarioClick("ما هي ساعات العمل ومقر الشركة؟")} className="px-3 py-1 bg-white border border-slate-200 rounded-full hover:border-emerald-500 text-slate-700 whitespace-nowrap shadow-xs">
              📍 ساعات العمل والمقر
            </button>
            <button onClick={() => handleScenarioClick("أبي أحجز موعد استشارة وأعرف الرسوم")} className="px-3 py-1 bg-white border border-slate-200 rounded-full hover:border-emerald-500 text-slate-700 whitespace-nowrap shadow-xs">
              📝 حجز استشارة ورسوم
            </button>
          </>
        )}
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Left/Center: Apple-Grade Voice Core ── */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm flex flex-col items-center justify-between min-h-[500px]">

            {/* Top Bar inside Core */}
            <div className="w-full flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${stateBadge.color}`} />
                <span className="text-xs font-semibold text-slate-800">
                  {stateBadge.text}
                </span>
              </div>

              {callActive && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-700 font-mono font-medium">
                  <Clock className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{formatDuration(callDuration)}</span>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">اللهجة:</span>
                <select
                  value={currentDialect}
                  onChange={(e) => onDialectChange(e.target.value)}
                  disabled={callActive}
                  className="bg-slate-100 border border-slate-200/80 rounded-lg text-xs text-slate-800 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                >
                  <option value="najdi">نجدية (الرياض)</option>
                  <option value="hijazi">حجازية (الغربية)</option>
                  <option value="fusha">فصحى معاصرة</option>
                  <option value="bilingual">ثنائي (عربي/إنجليزي)</option>
                </select>
              </div>
            </div>

            {/* Mode Switcher */}
            {callActive && (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full text-xs mt-1">
                <button
                  onClick={() => {
                    setIsHandsFree(true);
                    if (agentState === "listening") startListeningTurn();
                  }}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full transition-all ${
                    isHandsFree
                      ? "bg-white text-emerald-800 font-bold shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Zap className="w-3 h-3 text-emerald-600" />
                  <span>تحدث حر تلقائي (Hands-Free)</span>
                </button>

                <button
                  onClick={() => {
                    setIsHandsFree(false);
                    if (agentState === "listening") startListeningTurn();
                  }}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full transition-all ${
                    !isHandsFree
                      ? "bg-white text-slate-900 font-bold shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Mic className="w-3 h-3 text-slate-600" />
                  <span>انقر للتحدث (Push-to-Talk)</span>
                </button>
              </div>
            )}

            {/* Soundwave Visualizer */}
            <div className="relative w-full flex items-center justify-center py-2">
              <AudioVisualizer
                isActive={callActive}
                state={agentState}
                volumeLevel={volumeLevel}
              />
            </div>

            {/* Dynamic Status Pill */}
            {callActive && statusMsg && (
              <div
                className={`text-xs px-4 py-2 rounded-full border font-medium transition-all ${
                  isManualRecording
                    ? "bg-rose-50 border-rose-200 text-rose-800 animate-pulse"
                    : userIsSpeaking
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800 animate-pulse"
                    : agentState === "speaking"
                    ? "bg-blue-50 border-blue-200 text-blue-800"
                    : agentState === "thinking"
                    ? "bg-amber-50 border-amber-200 text-amber-800 animate-pulse"
                    : "bg-slate-100 border-slate-200 text-slate-700"
                }`}
              >
                {statusMsg}
              </div>
            )}

            {/* Interaction Button & Controls */}
            <div className="w-full pt-3 border-t border-slate-100 flex flex-col items-center gap-3">
              {!callActive ? (
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={handleStartCall}
                    className="flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold text-sm transition-all shadow-md shadow-emerald-900/10"
                  >
                    <Phone className="w-4 h-4" />
                    <span>ابدأ المكالمة الصوتية المباشرة مع سند</span>
                  </button>
                  <p className="text-[11px] text-slate-500">
                    مساعدك الصوتي الذكي جاهز للاستماع والرد بلهجة سعودية طبيعية
                  </p>
                </div>
              ) : (
                <div className="w-full space-y-3">
                  {/* Central Apple/Gemini Voice Orb */}
                  <div className="flex flex-col items-center gap-1.5">
                    <button
                      onClick={handleCenterAction}
                      className={`w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center gap-1 font-bold transition-all shadow-lg select-none ${
                        agentState === "speaking"
                          ? "bg-blue-600 border-blue-200 text-white gemini-speaking-orb"
                          : isManualRecording
                          ? "bg-rose-600 border-rose-200 text-white scale-105 animate-pulse"
                          : userIsSpeaking
                          ? "bg-emerald-700 border-emerald-300 text-white scale-105 apple-voice-orb-active"
                          : agentState === "thinking"
                          ? "bg-amber-600 border-amber-200 text-white"
                          : "bg-emerald-700 border-emerald-200 text-white hover:bg-emerald-800 active:scale-95"
                      }`}
                    >
                      {agentState === "speaking" ? (
                        <>
                          <VolumeX className="w-6 h-6" />
                          <span className="text-[10px]">مقاطعة</span>
                        </>
                      ) : isManualRecording ? (
                        <>
                          <Square className="w-6 h-6 fill-white" />
                          <span className="text-[10px]">إرسال</span>
                        </>
                      ) : userIsSpeaking ? (
                        <>
                          <Zap className="w-6 h-6 text-amber-300" />
                          <span className="text-[10px]">إرسال الآن</span>
                        </>
                      ) : agentState === "thinking" ? (
                        <>
                          <RefreshCw className="w-6 h-6 animate-spin" />
                          <span className="text-[10px]">تحليل...</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-7 h-7" />
                          <span className="text-[10px]">{isHandsFree ? "تكلم بحرية" : "انقر وتحدث"}</span>
                        </>
                      )}
                    </button>

                    <p className="text-[11px] text-slate-500 text-center font-medium">
                      {agentState === "speaking"
                        ? "سند يتحدث — انقر للمقاطعة في أي وقت"
                        : isManualRecording
                        ? "جاري تسجيل صوتك 🔴 — انقر للإرسال فوراً"
                        : userIsSpeaking
                        ? "صوتك مسموع 🟢... توقف وسيرد تلقائياً"
                        : isHandsFree
                        ? "تحدث بحرية دون الضغط على أي زر"
                        : "انقر على الزر للبدء في التسجيل ثم انقر للإرسال"}
                    </p>
                  </div>

                  {/* Text Input Fallback */}
                  <form
                    onSubmit={handleTextSubmit}
                    className="flex items-center gap-2 w-full bg-slate-50 border border-slate-200 rounded-xl p-1.5 focus-within:border-emerald-600"
                  >
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="أو اكتب سؤالك لسند هنا..."
                      disabled={agentState === "thinking"}
                      className="flex-1 bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none px-2 text-right"
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim() || agentState === "thinking"}
                      className="p-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-30 transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>

                  {/* End & Mute Strip */}
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setIsMuted((p) => !p)}
                      className={`px-3.5 py-1.5 rounded-full border text-xs flex items-center gap-1.5 transition-all ${
                        isMuted
                          ? "bg-rose-50 border-rose-200 text-rose-700 font-medium"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                      <span>{isMuted ? "رفع الكتم" : "كتم المايك"}</span>
                    </button>

                    <button
                      onClick={handleEndCall}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all shadow-xs"
                    >
                      <PhoneOff className="w-3.5 h-3.5" />
                      <span>إنهاء المكالمة</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Stage: Real-Time Transcript & Post-Call Card ── */}
        <div className="lg:col-span-5 flex flex-col gap-4">

          {/* Post-Call Outcome Action Card (If available) */}
          {lastCallOutcome && (
            <div className="bg-white border-2 border-emerald-500/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5 mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{lastCallOutcome.title}</h4>
                    <p className="text-[11px] text-slate-500">{lastCallOutcome.clientName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setLastCallOutcome(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-xs text-slate-700 space-y-1.5 mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                <p>• <strong>التفاصيل:</strong> {lastCallOutcome.detail}</p>
                <p>• <strong>الإجراء:</strong> {lastCallOutcome.actionNote}</p>
              </div>

              {/* 1-Click WhatsApp Follow-up Button */}
              <a
                href={`https://wa.me/?text=${lastCallOutcome.whatsappText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
                <span>إرسال تفاصيل المتابعة عبر الواتساب فوراً</span>
              </a>
            </div>
          )}

          {/* Live Transcript Box */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col h-[460px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-emerald-700" />
                المحادثة المباشرة مع المساعد
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                {messages.length} رسائل
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center px-4">
                  <Radio className="w-8 h-8 mb-2 opacity-30 text-emerald-700" />
                  <p className="font-medium text-slate-600">اضغط &quot;ابدأ المكالمة الصوتية&quot; وتحدث مع سند</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    المساعد ملم بكتالوج وأسعار قطاع {activeSector === "real_estate" ? "العقارات" : activeSector === "car_rental" ? "تأجير السيارات" : activeSector === "logistics" ? "الشحن واللوجستيات" : customCompanyName}
                  </p>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.sender === "user" ? "items-start" : "items-end"}`}
                  >
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1">
                      <span>{m.sender === "user" ? "أنت" : "سند 🤖"}</span>
                      <span>•</span>
                      <span>{m.timestamp}</span>
                      {m.latencyMs && (
                        <span className="text-emerald-700 font-mono">({m.latencyMs}ms)</span>
                      )}
                    </div>
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-2.5 leading-relaxed shadow-xs ${
                        m.sender === "user"
                          ? "bg-slate-100 text-slate-900 rounded-tl-none border border-slate-200/80"
                          : "bg-emerald-50 text-emerald-950 rounded-tr-none border border-emerald-200/80 font-medium"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))
              )}

              {agentState === "thinking" && (
                <div className="flex flex-col items-end">
                  <div className="text-[10px] text-slate-400 mb-1">سند 🤖</div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl rounded-tr-none px-4 py-3">
                    <div className="flex gap-1.5">
                      {[0, 150, 300].map((d) => (
                        <span
                          key={d}
                          className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce"
                          style={{ animationDelay: `${d}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={transcriptBottomRef} />
            </div>
          </div>
        </div>

      </div>

      {/* ── Modal: Catalog & Inventory Management ── */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-sm text-slate-900">
                  إدارة كتالوج قطاع: {activeSector === "real_estate" ? "العقارات الفاخرة" : activeSector === "car_rental" ? "أسطول تأجير السيارات" : activeSector === "logistics" ? "الشحنات النشطة" : "بيانات الشركة المخصصة"}
                </h3>
              </div>
              <button
                onClick={() => setShowCatalogModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {activeSector === "real_estate" && catalogData?.items?.map((item: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                <div key={item.id} className="border border-slate-200 rounded-2xl p-3.5 bg-slate-50/60 flex flex-col gap-1">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>{item.title}</span>
                    <span className="text-emerald-800">{item.price}</span>
                  </div>
                  <p className="text-slate-600">{item.district} • {item.specs}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">{item.status}</span>
                    <span>{item.financing}</span>
                  </div>
                </div>
              ))}

              {activeSector === "car_rental" && catalogData?.items?.map((item: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                <div key={item.id} className="border border-slate-200 rounded-2xl p-3.5 bg-slate-50/60 flex flex-col gap-1">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>{item.model} ({item.category})</span>
                    <span className="text-emerald-800">{item.daily_rate}</span>
                  </div>
                  <p className="text-slate-600">{item.specs}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">{item.status}</span>
                    <span>{item.branches}</span>
                  </div>
                </div>
              ))}

              {activeSector === "logistics" && catalogData?.items?.map((item: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                <div key={item.id} className="border border-slate-200 rounded-2xl p-3.5 bg-slate-50/60 flex flex-col gap-1">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>شحنة #{item.tracking_number} — {item.customer_name}</span>
                    <span className="text-emerald-800">{item.cod_amount}</span>
                  </div>
                  <p className="text-slate-600">{item.district} • {item.time_slot}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{item.status}</span>
                  </div>
                </div>
              ))}

              {activeSector === "custom" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">اسم المنشأة أو الشركة:</label>
                    <input
                      type="text"
                      value={customCompanyName}
                      onChange={(e) => setCustomCompanyName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">معلومات الشركة والخدمات والأسئلة الشائعة:</label>
                    <textarea
                      rows={5}
                      value={customFaqText}
                      onChange={(e) => setCustomFaqText(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      await fetch("/api/catalog/custom", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          company_name: customCompanyName,
                          faq_text: customFaqText,
                        }),
                      });
                      alert("تم حفظ بيانات المنشأة بنجاح! المساعد سيعتمدها فوراً في المكالمات القادمة.");
                      setShowCatalogModal(false);
                    }}
                    className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    حفظ وتحديث عقل المساعد الصوتي
                  </button>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-3 mt-3 flex justify-end">
              <button
                onClick={() => setShowCatalogModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Smartphone Live Demo Instructions (Ngrok HTTPS) ── */}
      {showNgrokModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-sm text-slate-900">تشغيل العرض الحي على هاتفك الذكي (Live Mobile Demo)</h3>
              </div>
              <button
                onClick={() => setShowNgrokModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
              <p>
                متصفحات الهواتف الذكية (iOS Safari و Android Chrome) تتطلب بروتوكول <strong>HTTPS الآمن</strong> للسماح للمايكرفون بالعمل أثناء المحادثة الصوتية الحية.
              </p>

              <div className="bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-[11px] ltr text-left">
                ngrok http 3000
              </div>

              <div className="space-y-1 text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p>1. افتح موجه الأوامر (Terminal) وشغل أمر Ngrok أعلاه.</p>
                <p>2. انسخ الرابط الآمن الناتج: <span className="font-mono text-emerald-700 font-bold">https://xxxx.ngrok-free.app</span></p>
                <p>3. افتح الرابط في متصفح سفاري أو كروم في جوالك.</p>
                <p>4. <strong>نصيحة أبل:</strong> انقر على &quot;مشاركة&quot; ثم &quot;إضافة إلى الشاشة الرئيسية (Add to Home Screen)&quot; لتفتح المنصة كتطبيق أصيل كامل الشاشة بدون شريط عنوان المتصفح!</p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 flex justify-end">
              <button
                onClick={() => setShowNgrokModal(false)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold"
              >
                فهمت ذلك، تم
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
