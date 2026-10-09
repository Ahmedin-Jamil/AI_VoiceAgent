"""
Saudi Arabic Phonetic Normalizer & Pronunciation Dictionary.
Enhances Text-to-Speech (Edge-TTS) clarity, dialect accuracy, and conversational pacing
by injecting diacritics (Tashkeel) and natural breath pauses into Najdi and Hijazi phrases.
"""

import re
from typing import Dict

# Dictionary of common Saudi dialect words mapped to their phonetically diacritized forms.
# Edge-TTS neural models use these diacritics to articulate authentic Gulf/Saudi phonology.
SAUDI_PHONETIC_MAP: Dict[str, str] = {
    # Pronouns & Interrogatives (أسماء الاستفهام والضمائر)
    "وش": "وِشْ",
    "وشو": "وِشُو",
    "ايش": "إِيشْ",
    "إيش": "إِيشْ",
    "كيفك": "كِيفِكْ",
    "شلونك": "شْلُونِكْ",
    "وين": "وِينْ",
    "وينك": "وِينِكْ",
    "مين": "مِينْ",
    "متى": "مِتَى",

    # Verbs & Desires (الأفعال والطلبات)
    "أبي": "أَبِي",
    "ابي": "أَبِي",
    "أبغى": "أَبْغَى",
    "ابغى": "أَبْغَى",
    "تبي": "تَبِي",
    "تبغى": "تَبْغَى",
    "نبي": "نَبِي",
    "نبغى": "نَبْغَى",
    "أقدر": "أَقْدَرْ",
    "اقدر": "أَقْدَرْ",
    "تقدر": "تِقْدَرْ",
    "أخدمك": "أَخْدِمِكْ",
    "اخدمك": "أَخْدِمِكْ",
    "نخدمك": "نِخْدِمِكْ",
    "أساعدك": "أَسَاعْدِكْ",
    "اساعدك": "أَسَاعْدِكْ",
    "أشوف": "أَشُوفْ",
    "اشوف": "أَشُوفْ",
    "أحجز": "أَحْجِزْ",
    "احجز": "أَحْجِزْ",
    "تحجز": "تَحْجِزْ",

    # Social Honorifics & Fillers (الترحيب والمجاملات النجدية والحجازية)
    "طال عمرك": "طَالَ عُمْرِكْ",
    "يا هلا": "يَا هَلَا...",
    "يا مرحبا": "يَا مَرْحَبَا...",
    "حياك الله": "حَيَّاكْ الله...",
    "حياك": "حَيَّاكْ...",
    "هلا والله": "هَلَا وَالله...",
    "أبشر": "أَبْشِرْ...",
    "ابشر": "أَبْشِرْ...",
    "أبشر بعزك": "أَبْشِرْ بِعِزَّكْ...",
    "تسلم": "تِسْلَمْ",
    "الله يسلمك": "الله يِسَلْمِكْ",
    "يعطيك العافية": "يَعْطِيكْ الْعَافْيَة",
    "جزاك الله خير": "جَزَاكْ الله خِيرْ",
    "مشكور": "مَشْكُورْ",
    "سم": "سَمّْ...",
    "زين": "زِينْ...",
    "تمام": "تَمَامْ...",
    "حلو": "حِلْوْ...",
    "طيب": "طَيِّبْ...",
    "خلاص": "خَلَاصْ...",
    "إن شاء الله": "إِنْ شَاءَ الله",
    "ان شاء الله": "إِنْ شَاءَ الله",
    "ما شاء الله": "مَا شَاءَ الله",
    "والله": "وَالله...",

    # Time & Manner (الظروف والأوقات)
    "الحين": "الْحِينْ",
    "هالحين": "هَالْحِينْ",
    "بكره": "بُكْرَه",
    "بعد بكره": "بَعْدْ بُكْرَه",
    "كذا": "كِذَا",
    "زي كذا": "زَيّْ كِذَا",
    "عشان": "عَشَانْ",
    "عيل": "عَيْلْ",
    "لحظة": "لَحْظَة بَسّْ...",
    "ثواني": "ثَوَانِي بَسّْ...",

    # Domain Terms (المصطلحات الخاصة بالخدمة)
    "سند": "سَنَدْ",
    "الرياض": "الرِّيَاضْ",
    "جدة": "جِدَّة",
    "دكتور": "دِكْتُورْ",
    "دكتورة": "دِكْتُورَة",
    "عيادة": "عِيَادَة",
    "عيادات": "عِيَادَاتْ",
    "موعد": "مَوْعِدْ",
    "مواعيد": "مَوَاعِيدْ",
    "شحنة": "شَحْنَة",
    "شحنتك": "شَحْنْتِكْ",
    "رقم التتبع": "رَقَمْ التَّتَبُّعْ",
    "أرامكس": "أَرَامِكْسْ",
    "سمسا": "سِمْسَا",
    "تأمين": "تَأْمِينْ",
}


def normalize_saudi_arabic(text: str) -> str:
    """
    Transforms colloquial Saudi Arabic text into phonetically enriched text
    optimized for high-fidelity, conversational Edge-TTS pronunciation.
    """
    if not text:
        return ""

    processed = text.strip()

    # 1. Clean excessive punctuation or markdown
    processed = re.sub(r'[*_#`~]', '', processed)
    processed = re.sub(r'\s+', ' ', processed)

    # 2. Replace known multi-word phrases first (e.g., "طال عمرك", "حياك الله")
    # Sort by phrase length descending so longest matches take precedence
    sorted_phrases = sorted(
        [k for k in SAUDI_PHONETIC_MAP.keys() if " " in k],
        key=len,
        reverse=True
    )
    for phrase in sorted_phrases:
        pattern = re.compile(rf'(?<!\S){re.escape(phrase)}(?!\S)', flags=re.IGNORECASE)
        processed = pattern.sub(SAUDI_PHONETIC_MAP[phrase], processed)

    # 3. Replace single dialect words
    single_words = [k for k in SAUDI_PHONETIC_MAP.keys() if " " not in k]
    for word in single_words:
        pattern = re.compile(rf'(?<!\S){re.escape(word)}(?!\S)', flags=re.IGNORECASE)
        processed = pattern.sub(SAUDI_PHONETIC_MAP[word], processed)

    # 4. Insert natural breathing pauses for conversational rhythm
    # Add an ellipsis after introductory greetings if followed directly by text
    processed = re.sub(r'(يَا هَلَا وَالله|مَرْحَبَا|حَيَّاكْ الله|أَبْشِرْ)\s+', r'\1... ', processed)

    # Clean double pauses
    processed = re.sub(r'\.{4,}', '...', processed)
    processed = re.sub(r'(\.\.\.)+', '... ', processed)
    processed = re.sub(r'\s+', ' ', processed).strip()

    return processed
