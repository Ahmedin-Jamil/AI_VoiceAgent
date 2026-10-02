"use client";

import React, { useState } from "react";
import { Phone, ShieldCheck, ArrowRightLeft, Server } from "lucide-react";

export const TelephonyHub: React.FC = () => {
  const [sipTrunkActive, setSipTrunkActive] = useState<boolean>(true);
  const [phoneNumber, setPhoneNumber] = useState<string>("+966 11 450 8899");
  const [forwardNumber, setForwardNumber] = useState<string>("+966 50 000 1234");
  const [fallbackTrigger, setFallbackTrigger] = useState<string>("sentiment_or_request");

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-8">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-5">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>مركز الربط الهاتفي للشركات (Saudi SIP Telephony Hub)</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          إدارة خطوط الاتصال المحلية المباشرة (STC / Mobily / Zain Trunk)، وتوجيه المكالمات وقواعد التحويل للموظفين البشريين.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: SIP Configuration (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">رقم الاتصال الموحد (Saudi DID Number)</h3>
                  <p className="text-[11px] text-zinc-400">الرقم المخصص لاستقبال مكالمات العملاء بالرياض</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">حالة الربط:</span>
                <button
                  onClick={() => setSipTrunkActive(!sipTrunkActive)}
                  className={`px-2.5 py-0.5 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-all ${
                    sipTrunkActive
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700"
                  }`}
                  title="انقر لتغيير حالة الاتصال"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      sipTrunkActive ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
                    }`}
                  />
                  {sipTrunkActive ? "متصل (LiveKit SIP)" : "مفصول (Disconnected)"}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">الرقم المخصص للخدمة:</label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] text-zinc-400">المزود المحلي (Saudi Carrier):</span>
                  <div className="font-semibold text-zinc-200 text-xs">STC Enterprise Trunk</div>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] text-zinc-400">ترميز الصوت (Audio Codec):</span>
                  <div className="font-semibold text-zinc-200 text-xs font-mono">G.711u / Opus (LiveKit SIP)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Call Forwarding & Human Fallback Rules */}
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-5">
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
              قواعد التحويل التلقائي للموظف البشري (Human Agent Escalation)
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-zinc-300 block mb-1">رقم هاتف مشرف العمليات أو الكول سنتر:</label>
                <input
                  type="text"
                  value={forwardNumber}
                  onChange={(e) => setForwardNumber(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">شرط تفعيل التحويل التلقائي:</label>
                <select
                  value={fallbackTrigger}
                  onChange={(e) => setFallbackTrigger(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="sentiment_or_request">عند طلب العميل المباشر أو عند رصد غضب/استياء (موصى به)</option>
                  <option value="request_only">عند طلب العميل فقط (&quot;حولني لموظف&quot;)</option>
                  <option value="never">مساعد ذكي فقط دون تحويل خارجي</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sovereign Compliance & Architecture Badges (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="text-sm font-semibold text-white">الامتثال لنظام حماية البيانات السعودي (PDPL)</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              جميع المكالمات الصوتية والبيانات المشفرة لا تغادر الحدود السعودية نهائياً. يتم تفريغ الصوت ومعالجة الذكاء الاصطناعي وتوليد الكلام 100% داخل خوادمك في الرياض.
            </p>

            <div className="space-y-2 pt-2 border-t border-zinc-900 text-xs">
              <div className="flex items-center justify-between text-zinc-300">
                <span>تخزين البيانات:</span>
                <span className="font-semibold text-emerald-400">خوادم محلية في الرياض (On-Prem)</span>
              </div>
              <div className="flex items-center justify-between text-zinc-300">
                <span>تسجيل المكالمات:</span>
                <span className="font-semibold text-zinc-200">مشفر وفق معيار AES-256</span>
              </div>
              <div className="flex items-center justify-between text-zinc-300">
                <span>رسوم الدقيقة الخارجية:</span>
                <span className="font-semibold text-emerald-400">0.00 ريال (Zero Twilio / OpenAI Fees)</span>
              </div>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <Server className="w-5 h-5" />
              <h3 className="text-sm font-semibold text-white">حالة خادم LiveKit SIP Gateway</h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">بورت SIP الإشاري (Signaling):</span>
                <span className="font-mono text-zinc-200">5060 UDP/TCP</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">بورت RTP لنقل الصوت (Media):</span>
                <span className="font-mono text-zinc-200">7882 UDP</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">بروتوكول WebRTC:</span>
                <span className="font-mono text-emerald-400">نشط (Port 7880)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
