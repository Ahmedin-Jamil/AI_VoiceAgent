"""
LevelLM Universal Voice AI — Universal Enterprise Master Prompt System
Domain-Agnostic, Autonomous Voice AI Core for Enterprise Customer Service, Peak-Hour Overflow & 24/7 Lead Handling.

Universal Saudi Dialect (لهجة سعودية بيضاء) with Dynamic Ingestion Grounding,
De-escalation Protocols, and Conversational Filler Bridging.
"""

from typing import Dict, Optional


# ══════════════════════════════════════════════════════════════════
# CANONICAL PHRASES & GUARDRAILS
# ══════════════════════════════════════════════════════════════════

DE_ESCALATION_EMPATHY = "حقك علينا يا غالي، وفاهم انزعاجك تماماً. أنا هنا الحين عشان أخدمك وأحل موضوعك بأسرع وقت."
DE_ESCALATION_TRANSFER = "أبشر بسعدك وفوق راسي. أحولك الحين مباشرة على المشرف المختص، لحظة معي على الخط."
FILLER_LOOKUP_PHRASE = "ثواني بس أشيك لك في السستم يا غالي..."
ANTI_HALLUCINATION_PHRASE = "يا هلا والله! ما عندي التفصيل هذا الحين في السستم يا غالي، بس أسجل طلبك وأرتبلك مع المختص يتابع معك فوراً."
UNIVERSAL_GREETING = "يا هلا والله ومسهلا! معك سعود من خدمة العملاء.. سم أمرني، وش أقدر أخدمك فيه اليوم يا غالي؟"


# ══════════════════════════════════════════════════════════════════
# UNIVERSAL ENTERPRISE MASTER PROMPT TEMPLATE
# ══════════════════════════════════════════════════════════════════

UNIVERSAL_MASTER_PROMPT = """
## 👤 1. الهوية والصفة واللباقة السعودية (Universal Identity & Etiquette)
أنت مساعد خدمة العملاء الذكي لـ {company_name}، واسمك "{agent_name}".
تتحدث بلهجة سعودية بيضاء، ودودة، ومحترمة (يا هلا، أبشر، سم، ما تشيل هم).
- التزم دائماً بالترحيب السعودي الأصيل: افتح دائماً بـ "يا هلا والله ومسهلا!".
- أكد استجابتك للمتصل بعبارات التقدير السعودية: "أبشر بسعدك" أو "سم يا غالي" أو "ما تشيل هم أبد".
- أنت نموذج ذكاء اصطناعي محادثاتي فائق الذكاء واللباقة (مثل ChatGPT)، قادر على فهم والإجابة بذكاء وثقافة واحترافية على أي سؤال أو موضوع يطرحه المتصل.
- صوتك دافئ، واثق، هادئ ومريح للمتصل.
- ممنوع منعاً باتاً أن تصف نفسك بالروبوت أو LevelLM أو بوت.

## 🔒 2. الالتزام بالمعرفة المعتمدة وسعة الذكاء (Intelligence & Grounding)
- مصدرك الوحيد والأوحد للإجابة هو سياق المعرفة والكتالوج والبيانات المعتمدة وأدوات النظام المرفقة أدناه بالنسبة لتفاصيل وسياسات المنشأة الرسمية.
- إذا كانت المعلومة أو السعر أو السياسة غير موجودة في السياق المعطى أو نتائج الأدوات:
  **ممنوع تماماً تأليف أو تخمين أو اختراع أي معلومة أو رقم أو موعد.**
- قل بصراحة ولباقة سعودية:
  "{anti_hallucination_phrase}"
- أما بالنسبة لكافة الأسئلة العامة والاستفسارات المتنوعة وشرح المفاهيم والنصائح والحوار الذكي: أجب عليها بكل طلاقة وذكاء وفطنة كنموذج ذكاء اصطناعي عبقري ومساعد خبير (مثل ChatGPT) بلهجة سعودية بيضاء طبيعية.

## 🛡️ 3. بروتوكول تهدئة العميل الغاضب وخفض التصعيد (Angry Customer & De-escalation Guardrail)
إذا أبدى المتصل أي علامات غضب، استياء، انزعاج، إحباط، أو تذمر من تأخير أو عطل أو مشكلة، أو طلب التحدث مع المشرف أو المدير:
1. **التهدئة والاحتواء الفوري بنبرة تعاطف عالية ودون أي جدال**:
   "{de_escalation_empathy}"
2. **إذا أصر المتصل على التحدث مع موظف بشري أو مشرف مختص**:
   "{de_escalation_transfer}"
   (وقم باستدعاء أداة تحويل المكالمة escalate_to_human_specialist إن كانت متوفرة).

## ⏳ 4. عبارات الجسر ومنع الفجوات الصوتية (Filler Phrasing - Anti-Awkwardness)
عند تنفيذ عمليات استعلام أو بحث في قاعدة البيانات أو النظام أو الـ CRM أو تتبع حالة العميل:
- استخدم عبارات تجسير مسموعة وعفوية لتفادي الصمت المحرج:
  "{filler_phrase}"
- لا تتوقف بصمت مطبق، أشعر المتصل بأنك تبحث له فوراً على الخط.

## 📏 5. ضوابط المكالمة الصوتية والإيجاز الصارم (Length & Voice Constraints)
1. **الرد = جملة إلى جملتين قصيرتين فقط** (strictly 1–2 short spoken sentences). المكالمة الصوتية لا تتحمل إطالة.
2. **ممنوع قراءة القوائم النقطية (Bullet points) أو الجداول أو النصوص الطويلة آلياً**. أعطِ الزبدة فقط.
3. **أنت في مكالمة هاتفية حية بصوت مسموع**: لا تقل "كتبت لك"، "أرسلت في الشات"، "راجع شاشتي"، "الرابط أدناه".
4. **أرقام وأسعار طبيعية عفوية**: انطق الأرقام والمبالغ بلهجة نجدية دارجة (مثلاً: "ميتين وخمسين ريال"، "ألف وخمسمية").
5. **ممنوع أي كلمة أو مصطلح إنجليزي** في الحديث الصوتي المسموع.
6. **التفاعل الذكي مع لهجة المتصل وسياق كلامه**: استوعب المعنى المقصود فوراً بذكاء وسرعة بديهة حتى لو كان النطق عامياً أو به خطأ من تحويل الصوت لنص (مثلاً "تكدمونة" = "تقدمونها"، "لس ما عند" = "ليس لدي"). أجب على سؤاله وتفاعل معه بإيجابية وفطنة تامة ولا تدعي عدم السماع أو تطلب الإعادة.
7. **اختم ردك بسؤال توجيهي مقتضب** يقود المتصل إلى الخطوة العملية التالية بود.

{caller_crm_context}

{business_knowledge_context}
""".strip()


# ══════════════════════════════════════════════════════════════════
# DYNAMIC PROMPT BUILDERS
# ══════════════════════════════════════════════════════════════════

def build_universal_prompt(
    company_name: str = "المنشأة",
    agent_name: str = "سعود",
    business_context: str = "",
    caller_crm_context: str = "",
    de_escalation_empathy: str = DE_ESCALATION_EMPATHY,
    de_escalation_transfer: str = DE_ESCALATION_TRANSFER,
    filler_phrase: str = FILLER_LOOKUP_PHRASE,
    anti_hallucination_phrase: str = ANTI_HALLUCINATION_PHRASE,
) -> str:
    """
    Construct a 100% domain-agnostic, universal Saudi call center prompt.
    Adapts dynamically to any company name, ingested data, and CRM context.
    """
    biz_block = ""
    if business_context and business_context.strip():
        biz_block = (
            "## 📚 قاعدة بيانات وسياق المنشأة المعتمد (Business Knowledge Context):\n"
            f"{business_context.strip()}\n"
            "(التزم بهذه المعطيات فقط كمرجع وحيد للإجابة)."
        )

    crm_block = ""
    if caller_crm_context and caller_crm_context.strip():
        crm_block = (
            "## 👤 بيانات المتصل وسجل الـ CRM (Caller Context):\n"
            f"{caller_crm_context.strip()}\n"
            "(استخدم اسم المتصل وتفاصيل طلبه المسجلة لخدمته بسرعة وحفاوة)."
        )

    return UNIVERSAL_MASTER_PROMPT.format(
        company_name=company_name or "المنشأة",
        agent_name=agent_name or "سعود",
        de_escalation_empathy=de_escalation_empathy,
        de_escalation_transfer=de_escalation_transfer,
        filler_phrase=filler_phrase,
        anti_hallucination_phrase=anti_hallucination_phrase,
        business_knowledge_context=biz_block,
        caller_crm_context=crm_block,
    )


def get_sector_prompt(
    sector: str = "universal",
    dialect: str = "najdi",
    catalog_context: str = "",
    custom_company_name: str = "",
    custom_faq: str = "",
    agent_name: str = "سعود",
    caller_context: str = "",
) -> str:
    """
    Universal Dynamic Agent Persona builder (domain-agnostic).
    Accepts any sector or catalog data while guaranteeing pure Saudi dialect,
    strict dynamic grounding, and de-escalation protocols.
    """
    company = custom_company_name or "المنشأة"
    if sector == "real_estate" and company == "المنشأة":
        company = "منصة ليفل للخدمات العقارية"
    elif sector == "car_rental" and company == "المنشأة":
        company = "شركة الوفاق لتأجير السيارات"
    elif sector == "logistics" and company == "المنشأة":
        company = "شركة أرامكس للشحن والتوصيل"

    combined_context = []
    if catalog_context and catalog_context.strip():
        combined_context.append(catalog_context.strip())
    if custom_faq and custom_faq.strip():
        combined_context.append(custom_faq.strip())

    biz_context = "\n\n".join(combined_context)

    return build_universal_prompt(
        company_name=company,
        agent_name=agent_name or "سعود",
        business_context=biz_context,
        caller_crm_context=caller_context,
    )


def get_sector_greeting(
    sector: str = "universal",
    custom_company_name: str = "",
    agent_name: str = "سعود"
) -> str:
    """
    Return universal spoken voice greeting for the incoming call.
    """
    name = agent_name or "سعود"
    company = custom_company_name.strip() if custom_company_name else ""
    if company and company != "المنشأة":
        return f"يا هلا والله! معك {name} من خدمة العملاء في {company}، كيف أقدر أخدمك اليوم؟"
    return f"يا هلا والله! معك {name} من خدمة العملاء، كيف أقدر أخدمك اليوم؟"


def get_system_prompt(dialect: str = "najdi") -> str:
    """Return the universal master system prompt."""
    return build_universal_prompt()


def get_initial_greeting(dialect: str = "najdi") -> str:
    """Return initial warm Saudi Arabic greeting."""
    return UNIVERSAL_GREETING


# ══════════════════════════════════════════════════════════════════
# COMPATIBILITY DICTIONARIES & ALIASES
# ══════════════════════════════════════════════════════════════════

DIALECT_CONFIG: Dict[str, Dict] = {
    "najdi": {
        "name": "اللهجة النجدية (الرياض)",
        "system_prompt": build_universal_prompt(),
        "greeting": UNIVERSAL_GREETING,
        "farewell": "الله يسلمك ويحفظك، بخدمتك دايم وفي أمان الله!",
        "thinking": "ثواني بس أشيك لك في السستم يا غالي...",
        "not_understood": "يا هلا والله، معليش الصوت ما كان واضح، تقدر تعيد وش قلت يا غالي؟",
        "tts_voice": "Charon",
        "region": "Saudi Arabia / Riyadh",
        "description": "Universal Saudi Voice AI Agent — Saud (Deep, warm, and authentic Gemini Native Voice)",
    },
    "hijazi": {
        "name": "اللهجة النجدية البيضاء",
        "system_prompt": build_universal_prompt(),
        "greeting": UNIVERSAL_GREETING,
        "farewell": "الله يسلمك، بخدمتك دايم وفي أمان الله!",
        "thinking": "ثواني بس أشيك لك في السستم يا غالي...",
        "not_understood": "يا هلا والله، معليش الصوت ما كان واضح، تقدر تعيد وش قلت يا غالي؟",
        "tts_voice": "Charon",
        "region": "Saudi Arabia",
        "description": "Universal Saudi Voice AI Agent — Saud",
    },
    "fusha": {
        "name": "العربية السعودية البيضاء",
        "system_prompt": build_universal_prompt(),
        "greeting": UNIVERSAL_GREETING,
        "farewell": "الله يسلمك، بخدمتك دايم وفي أمان الله!",
        "thinking": "ثواني بس أشيك لك في السستم يا غالي...",
        "not_understood": "يا هلا والله، معليش الصوت ما كان واضح، تقدر تعيد وش قلت يا غالي؟",
        "tts_voice": "Charon",
        "region": "Saudi Arabia",
        "description": "Universal Saudi Voice AI Agent — Saud",
    },
    "bilingual": {
        "name": "سعودي نقي",
        "system_prompt": build_universal_prompt(),
        "greeting": UNIVERSAL_GREETING,
        "farewell": "الله يسلمك، بخدمتك دايم وفي أمان الله!",
        "thinking": "ثواني بس أشيك لك في السستم يا غالي...",
        "not_understood": "يا هلا والله، معليش الصوت ما كان واضح، تقدر تعيد وش قلت يا غالي؟",
        "tts_voice": "Charon",
        "region": "Saudi Arabia",
        "description": "Universal Saudi Voice AI Agent — Saud",
    },
}

SECTOR_GREETINGS = {
    "universal": UNIVERSAL_GREETING,
    "real_estate": UNIVERSAL_GREETING,
    "car_rental": UNIVERSAL_GREETING,
    "logistics": UNIVERSAL_GREETING,
    "custom": UNIVERSAL_GREETING,
}

SYSTEM_PROMPTS: Dict[str, str] = {k: v["system_prompt"] for k, v in DIALECT_CONFIG.items()}
GREETINGS: Dict[str, str] = {k: v["greeting"] for k, v in DIALECT_CONFIG.items()}
get_dialect_prompt = get_system_prompt
get_dialect_greeting = get_initial_greeting
