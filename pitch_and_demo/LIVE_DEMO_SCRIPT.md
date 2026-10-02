# 🎙️ Live Demo Script for Riyadh Executive Meeting
## "سند" (Sanad Sovereign Voice AI Platform)

**Presenter:** Jamil Alamin Ahmedin  
**Estimated Demo Time:** 7 - 10 Minutes  
**Audience:** C-Level Executives, Operations Directors, Call Center Leaders

---

## 📋 Preparation Checklist (Before Entering the Room)

1. Launch the platform launcher script:
   `pitch_and_demo\START_ALL_SERVICES.bat`
2. Open the web dashboard in Chrome at:
   `http://localhost:3000`
3. Ensure laptop microphone and audio output volume are set to 75-80%.
4. Open the **Sandbox Tab** on the dashboard.

---

## 🎬 Live Presentation Flow

### Part 1: The Hook (2 Minutes)
> *"Good morning everyone / السلام عليكم ورحمة الله وبركاته.*  
> *Today, if a Saudi enterprise wants to deploy an AI voice agent, they are forced to do two things they hate:*  
> *First, pay \$0.20 every minute to foreign vendors like OpenAI or Twilio.*  
> *Second, stream Saudi citizens' private phone calls outside the Kingdom, which directly violates Saudi PDPL regulations.*  
>  
> *Today, I'm proud to show you 'سند' (Sanad): the first 100% sovereign, on-premise Voice AI platform built in Riyadh, fluent in Saudi Arabic, with zero per-minute API fees."*

---

### Part 2: Live Interactive Call Demo (5 Minutes)

#### Step 1: Initiating Call & Dialect Greeting
1. In the Web Sandbox, click **"بدء المكالمة التجريبية (Start Call)"**.
2. Point out the glowing visualizer and instantaneous greeting:
   * **Agent:** *"يا هلا والله ومرحبا! حياك الله في منصة سند، كيف أقدر أخدمك طال عمرك؟"*
3. **Presenter Comment:** *"Notice the authentic Riyadh Najdi greeting and sub-300ms response time. This is not a robotic translation; it's a native Saudi voice."*

#### Step 2: Clinic Appointment Booking & Insurance RAG
* **Presenter says into mic (or clicks scenario button):**
  > *"يا سند، ودي أحجز موعد استشارة جلدية، وابي اعرف ايش شركات التأمين اللي تقبلونها؟"*
* **Agent responds:**
  > *"حياك الله! نقبل معظم شركات التأمين الكبرى مثل التعاونية، بوبا، وميدغلف. وأبشر بحجز موعدك، بس أحتاج اسمك الكريم ورقم جوالك والموعد المناسب لك."*
* **Presenter Comment:** *"Notice how Sanad immediately executed a local RAG query over the clinic's internal knowledge base without sending any data to external clouds."*

#### Step 3: Demonstrating Real-Time Barge-in (Interruption)
* While the agent is speaking its second sentence, **immediately speak over it**:
  > *"معاك محمد القحطاني، وبكره الساعة 5 العصر مناسب"*
* **Observe:** The agent stops speaking within 40ms (thanks to Silero VAD), listens to the new input, and confirms the booking:
  > *"تم تسجيل موعدك يا أستاذ محمد بعيادة الجلدية غداً الساعة 5:00 مساءً، وبتوصلك رسالة SMS للتأكيد."*
* **Presenter Comment:** *"This is True Conversational Duplex. In traditional IVR, the caller gets stuck waiting. Here, the caller can interrupt anytime just like talking to a human receptionist."*

#### Step 4: Dialect Switcher in Real-Time (Najdi ➡️ Hijazi)
1. In the top bar, switch the dialect dropdown from **"النهجة النجدية"** to **"اللهجة الحجازية"**.
2. Click Start Call:
   * **Agent:** *"أهلاً وسهلاً ومرحبتين! معك سند لخدمة العملاء، كيف أقدر أساعدك اليوم؟"*
3. **Presenter Comment:** *"In a single click, companies can tailor the voice persona depending on whether they are serving customers in Riyadh, Jeddah, or corporate enterprise accounts."*

---

### Part 3: Architecture & ROI Wrap-Up (2 Minutes)
1. Navigate to the **"المقاييس الحية (Telemetry)"** tab on the dashboard:
   * Point out the **290ms End-to-End Latency**.
   * Highlight the **0.00 SAR per-minute fee** counter.
   * Show the **Pipeline Waterfall** (VAD 35ms, STT 120ms, LLM 90ms, TTS 45ms).
2. Conclude:
   > *"With Sanad, an enterprise handling 100,000 minutes a month saves over 70,000 SAR every month, maintains 100% regulatory compliance inside Saudi Arabia, and delivers a superior customer experience. We are ready to begin pilot deployments with your team immediately."*
