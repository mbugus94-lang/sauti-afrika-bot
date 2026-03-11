/**
 * Language utilities for African language support
 * Includes language detection, code mapping, and validation
 */

// Supported African languages with ISO 639-1 codes
export const SUPPORTED_AFRICAN_LANGUAGES = {
  // West African languages
  yo: { name: "Yoruba", region: "West Africa", nllbCode: "yor_Latn" },
  ha: { name: "Hausa", region: "West Africa", nllbCode: "hau_Latn" },
  ff: { name: "Fulfulde", region: "West Africa", nllbCode: "fuv_Latn" },
  bm: { name: "Bambara", region: "West Africa", nllbCode: "bam_Latn" },
  tw: { name: "Twi", region: "West Africa", nllbCode: "twi_Latn" },
  ig: { name: "Igbo", region: "West Africa", nllbCode: "ibo_Latn" },

  // East African languages
  sw: { name: "Swahili", region: "East Africa", nllbCode: "swh_Latn" },
  am: { name: "Amharic", region: "East Africa", nllbCode: "amh_Ethi" },
  om: { name: "Oromo", region: "East Africa", nllbCode: "gaz_Latn" },
  ti: { name: "Tigrinya", region: "East Africa", nllbCode: "tir_Ethi" },
  rw: { name: "Kinyarwanda", region: "East Africa", nllbCode: "kin_Latn" },
  lg: { name: "Luganda", region: "East Africa", nllbCode: "lug_Latn" },

  // Southern African languages
  zu: { name: "Zulu", region: "Southern Africa", nllbCode: "zul_Latn" },
  xh: { name: "Xhosa", region: "Southern Africa", nllbCode: "xho_Latn" },
  st: { name: "Sesotho", region: "Southern Africa", nllbCode: "sot_Latn" },
  af: { name: "Afrikaans", region: "Southern Africa", nllbCode: "afr_Latn" },
  sn: { name: "Shona", region: "Southern Africa", nllbCode: "sna_Latn" },
  ny: { name: "Chichewa", region: "Southern Africa", nllbCode: "nya_Latn" },

  // Central African languages
  ln: { name: "Lingala", region: "Central Africa", nllbCode: "lin_Latn" },
  kg: { name: "Kongo", region: "Central Africa", nllbCode: "kon_Latn" },

  // Major languages for context
  en: { name: "English", region: "Global", nllbCode: "eng_Latn" },
  fr: { name: "French", region: "Global", nllbCode: "fra_Latn" },
  ar: { name: "Arabic", region: "North Africa", nllbCode: "arb_Arab" },
};

// Language detection patterns (simplified - in production use a proper NLP library)
export function detectLanguage(text: string): string {
  // This is a simplified implementation
  // In production, use a library like `langdetect` or `textcat`
  // or call a language detection API

  // For now, return English as default
  // This should be replaced with actual detection logic
  return "en";
}

/**
 * Validate if a language code is supported
 */
export function isSupportedLanguage(languageCode: string): boolean {
  return languageCode in SUPPORTED_AFRICAN_LANGUAGES;
}

/**
 * Get NLLB language code for translation
 */
export function getNLLBLanguageCode(iso639Code: string): string | null {
  const lang =
    SUPPORTED_AFRICAN_LANGUAGES[iso639Code as keyof typeof SUPPORTED_AFRICAN_LANGUAGES];
  return lang ? lang.nllbCode : null;
}

/**
 * Get language name from code
 */
export function getLanguageName(iso639Code: string): string | null {
  const lang =
    SUPPORTED_AFRICAN_LANGUAGES[iso639Code as keyof typeof SUPPORTED_AFRICAN_LANGUAGES];
  return lang ? lang.name : null;
}

/**
 * Get all supported languages
 */
export function getSupportedLanguages() {
  return Object.entries(SUPPORTED_AFRICAN_LANGUAGES).map(([code, data]) => ({
    code,
    ...data,
  }));
}

/**
 * Get languages by region
 */
export function getLanguagesByRegion(region: string) {
  return Object.entries(SUPPORTED_AFRICAN_LANGUAGES)
    .filter(([, data]) => data.region === region)
    .map(([code, data]) => ({
      code,
      ...data,
    }));
}
