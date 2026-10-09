"use client";

import React from "react";
import { Zap, Clock, ShieldCheck, HeartHandshake, CheckCircle2 } from "lucide-react";

export const TelemetryTab: React.FC = () => {
  const callLogs = [
    {
      id: "CALL-9821",
      caller: "+966 50 123 4567 (الرياض)",
      time: "منذ 4 دقائق",
      duration: "1:42 دقيقة",
      sentiment: "إيجابي (Positive)",
      latency: "285ms",
      intent: "حجز موعد عيادة جلدية",
      status: "ناجح (Confirmed)",
    },
    {
      id: "CALL-9820",
      caller: "+966 55 987 6543 (جدة)",
      time: "منذ 18 دقيقة",
      duration: "0:58 دقيقة",
      sentiment: "محايد (Neutral)",
      latency: "295ms",
      intent: "تتبع شحنة لوجستية",
      status: "ناجح (Delivered Info)",
    },
    {
      id: "CALL-9819",
      caller: "+966 54 332 1100 (الدمام)",
      time: "منذ 35 دقيقة",
      duration: "2:15 دقيقة",
      sentiment: "استفسار خاص",
      latency: "310ms",
      intent: "تحويل لمشرف العمليات",
      status: "تم التحويل (Escalated)",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span>متوسط زمن الاستجابة (Latency)</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">290 ms</div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <span>-65ms أسرع من المتوسط العالمي</span>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span>رسوم استهلاك الـ APIs</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">0.00 ريال</div>
          <div className="text-[11px] text-zinc-400 mt-1">
            100% استضافة محلية سيادية
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span>معدل حل المكالمة تلقائياً</span>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">88.4%</div>
          <div className="text-[11px] text-zinc-400 mt-1">
            دون الحاجة لتدخل بشري
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span>مؤشر رضا العميل (CSAT)</span>
            <HeartHandshake className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">4.9 / 5.0</div>
          <div className="text-[11px] text-rose-400 mt-1">
            بفضل الفهم الدقيق للهجة النجدية
          </div>
        </div>
      </div>

      {/* Latency Pipeline Breakdown */}
      <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          تحليل زمن الاستجابة خطوة بخطوة (Pipeline Waterfall)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-xs space-y-1">
            <span className="text-zinc-400">1. كشف التحدث (VAD)</span>
            <div className="text-lg font-bold font-mono text-emerald-400">35 ms</div>
            <p className="text-[10px] text-zinc-500">Silero VAD (ONNX)</p>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-xs space-y-1">
            <span className="text-zinc-400">2. تحويل الصوت لنص (STT)</span>
            <div className="text-lg font-bold font-mono text-emerald-400">120 ms</div>
            <p className="text-[10px] text-zinc-500">Faster-Whisper Base (Local GPU)</p>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-xs space-y-1">
            <span className="text-zinc-400">3. استجابة الدماغ (LLM TTFT)</span>
            <div className="text-lg font-bold font-mono text-indigo-400">90 ms</div>
            <p className="text-[10px] text-zinc-500">Google Gemini 3.8 Flash (Cloud Free)</p>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-xs space-y-1">
            <span className="text-zinc-400">4. توليد الصوت (TTS Chunk)</span>
            <div className="text-lg font-bold font-mono text-blue-400">45 ms</div>
            <p className="text-[10px] text-zinc-500">ElevenLabs Human Voice (Saudi Dialect)</p>
          </div>
        </div>
      </div>

      {/* Recent Calls Table */}
      <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-semibold text-zinc-200">سجل المكالمات الحديثة والتحليلات</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="pb-3 font-medium">رقم المكالمة</th>
                <th className="pb-3 font-medium">المتصل والمدينة</th>
                <th className="pb-3 font-medium">الوقت</th>
                <th className="pb-3 font-medium">المدة</th>
                <th className="pb-3 font-medium">الغرض / الإجراء</th>
                <th className="pb-3 font-medium">زمن الاستجابة</th>
                <th className="pb-3 font-medium">انطباع العميل</th>
                <th className="pb-3 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {callLogs.map((log) => (
                <tr key={log.id} className="text-zinc-300 hover:bg-zinc-900/40">
                  <td className="py-3.5 font-mono text-zinc-400">{log.id}</td>
                  <td className="py-3.5 font-medium text-white">{log.caller}</td>
                  <td className="py-3.5 text-zinc-400">{log.time}</td>
                  <td className="py-3.5 font-mono">{log.duration}</td>
                  <td className="py-3.5">{log.intent}</td>
                  <td className="py-3.5 font-mono text-emerald-400">{log.latency}</td>
                  <td className="py-3.5">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px]">
                      {log.sentiment}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px]">
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
