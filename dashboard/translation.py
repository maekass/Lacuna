"""
AI-Powered Translation System for Clinical Trials Intelligence Platform
Supports 100+ languages via Google Translate API
"""

import streamlit as st
import pandas as pd
from deep_translator import GoogleTranslator
from functools import lru_cache
from typing import Optional

# Supported languages with native names
SUPPORTED_LANGUAGES = {
    'en': 'English',
    'es': 'Español',
    'fr': 'Français',
    'de': 'Deutsch',
    'zh-CN': '简体中文',
    'zh-TW': '繁體中文',
    'ja': '日本語',
    'ko': '한국어',
    'ar': 'العربية',
    'hi': 'हिन्दी',
    'pt': 'Português',
    'ru': 'Русский',
    'it': 'Italiano',
    'nl': 'Nederlands',
    'pl': 'Polski',
    'tr': 'Türkçe',
    'vi': 'Tiếng Việt',
    'th': 'ไทย',
    'id': 'Bahasa Indonesia',
    'ms': 'Bahasa Melayu',
    'fil': 'Filipino',
    'bn': 'বাংলা',
    'ur': 'اردو',
    'fa': 'فارسی',
    'he': 'עברית',
    'sw': 'Kiswahili',
    'am': 'አማርኛ',
    'yo': 'Yorùbá',
    'ig': 'Igbo',
    'ha': 'Hausa',
}

# Cache translations to improve performance
@lru_cache(maxsize=1000)
def translate_text(text: str, target_lang: str, source_lang: str = 'en') -> str:
    """
    Translate text using Google Translate API.
    
    Args:
        text: Text to translate
        target_lang: Target language code (e.g., 'es', 'fr', 'zh-CN')
        source_lang: Source language code (default: 'en')
    
    Returns:
        Translated text
    """
    if not text or target_lang == source_lang:
        return text
    
    try:
        translator = GoogleTranslator(source=source_lang, target=target_lang)
        # Handle long text by chunking (Google Translate has 5000 char limit)
        if len(text) > 4500:
            # Split by paragraphs
            chunks = text.split('\n\n')
            translated_chunks = []
            for chunk in chunks:
                if chunk.strip():
                    translated_chunks.append(translator.translate(chunk))
                else:
                    translated_chunks.append('')
            return '\n\n'.join(translated_chunks)
        else:
            return translator.translate(text)
    except Exception as e:
        # Fallback: return original text if translation fails
        st.warning(f"Translation failed for '{text[:50]}...': {str(e)}")
        return text


def get_language_selector() -> str:
    """
    Render language selector in sidebar and return selected language code.
    
    Returns:
        Selected language code (e.g., 'en', 'es', 'zh-CN')
    """
    # Initialize session state for language
    if 'selected_language' not in st.session_state:
        st.session_state['selected_language'] = 'en'
    
    # Language selector in sidebar
    st.sidebar.markdown("---")
    st.sidebar.markdown("### 🌍 Language / 语言 / Idioma")
    
    # Create display options (code: native name)
    language_options = {code: name for code, name in SUPPORTED_LANGUAGES.items()}
    
    # Selectbox with native language names
    selected_display = st.sidebar.selectbox(
        "Select Language",
        options=list(language_options.values()),
        index=list(language_options.values()).index(language_options[st.session_state['selected_language']]),
        key='language_selector'
    )
    
    # Get language code from display name
    selected_code = [code for code, name in language_options.items() if name == selected_display][0]
    
    # Update session state
    st.session_state['selected_language'] = selected_code
    
    # Show translation info
    if selected_code != 'en':
        st.sidebar.caption(f"🤖 AI-powered translation to {selected_display}")
        st.sidebar.caption("Translation quality: Google Translate API")
    
    return selected_code


def translate_if_needed(text: str, target_lang: Optional[str] = None) -> str:
    """
    Translate text if target language is not English.
    
    Args:
        text: Text to translate
        target_lang: Target language code (if None, uses session state)
    
    Returns:
        Translated text (or original if target is English)
    """
    if target_lang is None:
        target_lang = st.session_state.get('selected_language', 'en')
    
    if target_lang == 'en':
        return text
    
    return translate_text(text, target_lang)


def translate_dataframe_columns(df, columns: list, target_lang: Optional[str] = None):
    """
    Translate specific columns in a pandas DataFrame.
    
    Args:
        df: Pandas DataFrame
        columns: List of column names to translate
        target_lang: Target language code (if None, uses session state)
    
    Returns:
        DataFrame with translated columns
    """
    if target_lang is None:
        target_lang = st.session_state.get('selected_language', 'en')
    
    if target_lang == 'en':
        return df
    
    df_copy = df.copy()
    
    for col in columns:
        if col in df_copy.columns:
            # Translate each cell in the column
            df_copy[col] = df_copy[col].apply(
                lambda x: translate_text(str(x), target_lang) if pd.notna(x) else x
            )
    
    return df_copy


def get_translation_badge(target_lang: str) -> str:
    """
    Get a badge/indicator showing translation is active.
    
    Args:
        target_lang: Target language code
    
    Returns:
        HTML badge string
    """
    if target_lang == 'en':
        return ""
    
    lang_name = SUPPORTED_LANGUAGES.get(target_lang, target_lang)
    
    return f"""
    <div style="background-color: #4CAF50; 
                color: white; 
                padding: 0.5rem 1rem; 
                border-radius: 5px; 
                display: inline-block; 
                margin-bottom: 1rem;">
        🌍 Translated to {lang_name} via AI
    </div>
    """


# Helper function for common UI elements
def t(text: str) -> str:
    """
    Shorthand for translate_if_needed.
    
    Usage: st.markdown(t("Hello World"))
    """
    return translate_if_needed(text)
