# AI-Powered Translation System

## Overview

The Clinical Trials Intelligence Platform now supports **30+ languages** via AI-powered translation, making clinical trial data accessible to a global audience.

## Supported Languages

### Major Languages
- **English** (en) - Default
- **Spanish** (es) - Español
- **French** (fr) - Français
- **German** (de) - Deutsch
- **Chinese Simplified** (zh-CN) - 简体中文
- **Chinese Traditional** (zh-TW) - 繁體中文
- **Japanese** (ja) - 日本語
- **Korean** (ko) - 한국어
- **Arabic** (ar) - العربية
- **Hindi** (hi) - हिन्दी
- **Portuguese** (pt) - Português
- **Russian** (ru) - Русский
- **Italian** (it) - Italiano

### Additional Languages
- Dutch, Polish, Turkish, Vietnamese, Thai, Indonesian, Malay, Filipino
- Bengali, Urdu, Persian, Hebrew
- Swahili, Amharic, Yoruba, Igbo, Hausa

## How It Works

### Translation Engine
- **Provider:** Google Translate API (via `deep-translator` library)
- **Quality:** Production-grade neural machine translation
- **Performance:** Cached translations for speed
- **Fallback:** Original text if translation fails

### User Experience

1. **Language Selector**
   - Located in sidebar under "Language / 语言 / Idioma"
   - Shows language names in native script
   - Instant translation on selection

2. **Translation Badge**
   - Green badge appears when non-English language selected
   - Shows "Translated to [Language] via AI"
   - Indicates AI-powered translation is active

3. **What Gets Translated**
   - Page titles and headers
   - Descriptive text and explanations
   - UI labels and instructions
   - Data table column headers (optional)

4. **What Doesn't Get Translated**
   - NCT IDs and trial identifiers
   - Sponsor names and company names
   - Technical codes (ICD-10, SNOMED, etc.)
   - URLs and links

## Implementation

### For Developers

#### Basic Usage

```python
from dashboard.translation import t

# Translate any text
st.markdown(t("Hello World"))

# Translate with f-strings
st.markdown(f"# {t('Mission')}")

# Translate multi-line text
st.markdown(t("""
This is a long paragraph that will be
translated to the user's selected language.
"""))
```

#### Advanced Usage

```python
from dashboard.translation import (
    translate_if_needed,
    translate_dataframe_columns,
    get_translation_badge
)

# Manual translation
translated_text = translate_if_needed("Text to translate", target_lang='es')

# Translate DataFrame columns
df_translated = translate_dataframe_columns(
    df, 
    columns=['title', 'description'], 
    target_lang='fr'
)

# Show translation badge
st.markdown(get_translation_badge('zh-CN'), unsafe_allow_html=True)
```

### Performance Optimization

**Caching:**
- All translations are cached using `@lru_cache(maxsize=1000)`
- Same text won't be translated twice
- Significantly improves performance

**Chunking:**
- Long text (>4500 chars) automatically chunked
- Prevents API limits
- Maintains paragraph structure

## Use Cases

### 1. Global Impact Investing
**Scenario:** Impact investor in Spain reviewing clinical trials

**Benefit:**
- Read trial descriptions in Spanish
- Understand methodology in native language
- Make informed decisions without language barrier

### 2. International Clinical Researchers
**Scenario:** Japanese researcher exploring US clinical trials

**Benefit:**
- Access trial data in Japanese
- Understand complex statistical methods
- Collaborate across language barriers

### 3. Patient Advocacy
**Scenario:** Arabic-speaking patient advocate searching for trials

**Benefit:**
- Find relevant trials in Arabic
- Understand eligibility criteria
- Share information with community

### 4. Multilingual Teams
**Scenario:** International biotech company with global team

**Benefit:**
- Each team member views data in preferred language
- Consistent data, personalized presentation
- Improved collaboration and understanding

## Technical Details

### Translation Quality

**Strengths:**
- High accuracy for medical/scientific terminology
- Maintains formatting (bold, italics, lists)
- Preserves technical precision

**Limitations:**
- Idioms may not translate perfectly
- Very technical jargon may need review
- Cultural context may vary

### Privacy & Security

- **No data storage:** Translations processed in real-time
- **No PII exposure:** Only UI text translated, not user data
- **API security:** Uses Google's secure translation API

### Accessibility

**WCAG Compliance:**
- Language selector keyboard accessible
- Screen reader compatible
- High contrast translation badge

**Mobile Responsive:**
- Language selector works on mobile
- Translation badge adapts to screen size

## Future Enhancements

### Planned Features

1. **Custom Medical Dictionary**
   - Pre-translate common medical terms
   - Ensure consistency across platform
   - Improve accuracy for clinical terminology

2. **User Preferences**
   - Save language preference
   - Auto-detect browser language
   - Remember per-user settings

3. **Translation Quality Feedback**
   - Report translation issues
   - Suggest improvements
   - Community-driven corrections

4. **Offline Translation**
   - Download language packs
   - Work without internet
   - Faster performance

5. **More Languages**
   - Add 70+ additional languages
   - Regional dialects
   - Minority languages

## FAQ

**Q: Is translation free?**
A: Yes, using Google Translate's free tier via `deep-translator`.

**Q: How accurate is the translation?**
A: Very high for general medical/scientific text. Complex technical jargon may need expert review.

**Q: Can I translate data tables?**
A: Yes, using `translate_dataframe_columns()` function. Currently optional to avoid performance issues.

**Q: Does translation work offline?**
A: No, requires internet connection. Offline support planned for future.

**Q: Can I add a new language?**
A: Yes! Edit `SUPPORTED_LANGUAGES` in `dashboard/translation.py` and submit a PR.

**Q: What if translation fails?**
A: System falls back to original English text with a warning message.

## Support

**Issues:** Report translation bugs on GitHub Issues
**Suggestions:** Submit feature requests via GitHub Discussions
**Contributions:** PRs welcome for new languages or improvements

---

**Built with:** Google Translate API via `deep-translator`
**License:** Same as main project
**Maintainer:** Clinical Trials Intelligence Team
