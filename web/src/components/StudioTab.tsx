"use client";

import React, { useState } from "react";
import { Save, Plus, Trash2, BookOpen, Sliders, CheckCircle2, FileText } from "lucide-react";

interface StudioTabProps {
  dialect: string;
  onDialectChange: (dialect: string) => void;
  systemPrompt: string;
  onSystemPromptChange: (prompt: string) => void;
  voice: string;
  onVoiceChange: (voice: string) => void;
}

export const StudioTab: React.FC<StudioTabProps> = ({
  dialect,
  onDialectChange,
  systemPrompt,
  onSystemPromptChange,
  voice,
  onVoiceChange,
}) => {
  const [temperature, setTemperature] = useState<number>(0.3);
  const [voiceSpeed, setVoiceSpeed] = useState<number>(1.0);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [faqs, setFaqs] = useState([
    {
      category: "عيادات ومواعيد طبية",
      question: "كيف أحجز موعد كشف أو استشارة؟",
      answer: "تقدر تحجز موعدك فوراً من خلالي؛ بس أحتاج منك اسمك الكريم ورقم جوالك والعيادة المطلوبة والموعد المناسب لك طال عمرك.",
    },
    {
      category: "عيادات ومواعيد طبية",
      question: "ما هي شركات التأمين الطبي المعتمدة لديكم؟",
      answer: "نقبل معظم شركات التأمين الكبرى في المملكة: التعاونية، بوبا العربية، ميدغلف، وسلامة.",
    },
    {
      category: "الشحن والتوصيل اللوجستي",
      question: "ما هي مدة توصيل الشحنات داخل الرياض وخارجها؟",
      answer: "التوصيل داخل مدينة الرياض يتم خلال 24 ساعة، ولباقي مدن المملكة خلال 48 إلى 72 ساعة.",
    },
  ]);

  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newCategory, setNewCategory] = useState("خدمة العملاء العامة");

  const handleSaveConfig = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleAddFaq = () => {
    if (!newQuestion || !newAnswer) return;
    setFaqs([...faqs, { category: newCategory, question: newQuestion, answer: newAnswer }]);
    setNewQuestion("");
    setNewAnswer("");
  };

  const handleDeleteFaq = (idx: number) => {
    setFaqs(faqs.filter((_, i) => i !== idx));
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-8">
      {/* Studio Header & Save CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>استوديو تخصيص المساعد الصوتي (Agent Builder Studio)</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            خصص شخصية المساعد، اللهجة السعودية المرغوبة، وسلوك المحادثة وقاعدة المعرفة المحلية.
          </p>
        </div>

        <button
          onClick={handleSaveConfig}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-all shadow-md shadow-emerald-600/20 active:scale-95"
        >
          {savedSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>تم حفظ التعديلات!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>حفظ الإعدادات في الخادم السيادي</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Persona & System Prompt Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                توجيهات النظام والشخصية (System Instructions)
              </label>
              <span className="text-[11px] text-zinc-500 font-mono">
                {systemPrompt.length} حرف
              </span>
            </div>

            <textarea
              value={systemPrompt}
              onChange={(e) => onSystemPromptChange(e.target.value)}
              rows={12}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-200 leading-relaxed font-sans focus:outline-none focus:border-emerald-500/80 resize-none"
              placeholder="اكتب التوجيهات الخاصة بسلوك وشخصية المساعد الصوتي..."
            />

            <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-2 border-t border-zinc-900">
              <span>* يُفضل الحفاظ على إجابات مختصرة ومباشرة (جملتان أو ثلاث كحد أقصى) لتسريع زمن المكالمة.</span>
            </div>
          </div>

          {/* RAG Knowledge Base FAQ Manager */}
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                قاعدة المعرفة السيادية (Sovereign RAG FAQ Store)
              </h3>
              <span className="text-xs text-zinc-400">{faqs.length} سؤال موثق</span>
            </div>

            {/* Existing FAQs */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-1 text-xs relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-medium">
                      {faq.category}
                    </span>
                    <button
                      onClick={() => handleDeleteFaq(idx)}
                      className="text-zinc-500 hover:text-red-400 transition-colors p-1"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="font-semibold text-zinc-200 pt-1">س: {faq.question}</div>
                  <div className="text-zinc-400 text-[11px] leading-relaxed">ج: {faq.answer}</div>
                </div>
              ))}
            </div>

            {/* Add FAQ Form */}
            <div className="pt-4 border-t border-zinc-800/80 space-y-3">
              <span className="text-xs font-medium text-zinc-300">إضافة سؤال وجواب جديد:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="الفئة (مثل: عيادات، شحن، أسعار)"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  placeholder="سؤال العميل المتوقع..."
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <textarea
                placeholder="الإجابة الصوتية المعتمدة..."
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                rows={2}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 resize-none"
              />
              <button
                onClick={handleAddFaq}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>إدراج في قاعدة المعرفة</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Dialect, Voice & Model Hyperparameters (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-5">
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 border-b border-zinc-800/80 pb-3">
              <Sliders className="w-4 h-4 text-indigo-400" />
              إعدادات اللهجة والصوت المحلي
            </h3>

            {/* Dialect Selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-300">اللهجة السعودية المعتمدة:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "najdi", name: "النهجة النجدية (الرياض)", desc: "يا هلا وطال عمرك وسمّ" },
                  { id: "hijazi", name: "اللهجة الحجازية (الغربية)", desc: "أهلاً وسيدي ومن عيوني" },
                  { id: "fusha", name: "الفصحى البيضاء المعاصرة", desc: "أسلوب رسمي ومؤسسي" },
                  { id: "bilingual", name: "ثنائي اللغة (عربي / إنجليزي)", desc: "تبديل ذكي تلقائي" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onDialectChange(item.id)}
                    className={`text-right p-3 rounded-xl border transition-all text-xs ${
                      dialect === item.id
                        ? "bg-emerald-500/10 border-emerald-500/60 text-white shadow-sm"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-850"
                    }`}
                  >
                    <div className="font-semibold text-zinc-200">{item.name}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Model Selector */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-medium text-zinc-300">الصوت العصبي (Neural Voice):</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "ar-SA-HamedNeural", name: "حامد (رجالي)", desc: "صوت سعودي أصيل وودود" },
                  { id: "ar-SA-ZariyahNeural", name: "زارية (نسائي)", desc: "صوت احترافي راقي" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onVoiceChange(item.id)}
                    className={`text-right p-3 rounded-xl border transition-all text-xs ${
                      voice === item.id
                        ? "bg-indigo-500/10 border-indigo-500/60 text-white shadow-sm"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-850"
                    }`}
                  >
                    <div className="font-semibold text-zinc-200">{item.name}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* LLM Temperature Slider */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300">درجة حرارة النموذج (Temperature):</span>
                <span className="font-mono text-emerald-400 font-bold">{temperature}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>0.0 (دقيق وملتزم بقاعدة المعرفة)</span>
                <span>1.0 (إبداعي)</span>
              </div>
            </div>

            {/* Voice Speed Slider */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300">سرعة نطق الصوت (Speech Rate):</span>
                <span className="font-mono text-emerald-400 font-bold">{voiceSpeed}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.3"
                step="0.05"
                value={voiceSpeed}
                onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>0.8x (هادئ)</span>
                <span>1.3x (سريع جداً)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
