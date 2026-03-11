/**
 * Language Processing APIs
 * Handles translation, speech-to-text, and text-to-speech
 */

import { invokeLLM } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";
import { ENV } from "./_core/env";
import { detectLanguage, getNLLBLanguageCode } from "./language";

/**
 * Translate text using NLLB-200 model via LLM
 * This uses the LLM's translation capabilities
 */
export async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string> {
  if (sourceLanguage === targetLanguage) {
    return text;
  }
  if (!ENV.enableTranslation) {
    return text;
  }

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a professional translator specializing in African languages. Translate the following text from ${sourceLanguage} to ${targetLanguage}. Provide only the translated text without any additional explanation or commentary.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    const translatedText =
      response.choices[0]?.message?.content || text;
    return typeof translatedText === "string" ? translatedText : text;
  } catch (error) {
    console.error("Translation error:", error);
    // Return original text if translation fails
    return text;
  }
}

/**
 * Detect language from text using LLM
 */
export async function detectLanguageFromText(text: string): Promise<string> {
  if (!ENV.enableLanguageDetection) {
    return ENV.defaultLanguage;
  }

  if (ENV.languageDetectionMode === "heuristic") {
    return detectLanguage(text);
  }

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a language detection expert. Identify the language of the provided text and respond with ONLY the ISO 639-1 language code (e.g., 'en', 'sw', 'yo', 'zu'). Do not include any other text.",
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    const contentRaw = response.choices[0]?.message?.content;
    const detectedCode =
      typeof contentRaw === "string" ? contentRaw.trim() : "en";
    // Validate the code is a valid ISO 639-1 code (2 characters)
    return detectedCode.length === 2 ? detectedCode.toLowerCase() : "en";
  } catch (error) {
    console.error("Language detection error:", error);
    return "en"; // Default to English
  }
}

/**
 * Transcribe audio to text using Whisper
 */
export async function transcribeAudioToText(
  audioUrl: string,
  language?: string
): Promise<{
  text: string;
  language: string;
  confidence?: number;
}> {
  try {
    const result = await transcribeAudio({
      audioUrl,
      language,
    });

    // Handle both success and error responses
    if ("error" in result) {
      throw new Error(result.error);
    }

    return {
      text: result.text || "",
      language: result.language || language || "en",
      confidence: (result as any).confidence,
    };
  } catch (error) {
    console.error("Audio transcription error:", error);
    throw new Error(`Failed to transcribe audio: ${error}`);
  }
}

/**
 * Generate speech from text using TTS
 * Returns URL to the generated audio file
 */
export async function generateSpeech(
  text: string,
  language: string,
  voice?: string
): Promise<{
  audioUrl: string;
  duration?: number;
}> {
  try {
    // This would integrate with a TTS service like Vapi, Google Cloud TTS, or similar
    // For now, we'll create a placeholder that shows the expected interface

    // In production, you would call:
    // const response = await vapiClient.generateSpeech({ text, language, voice });
    // or
    // const response = await googleTTS.synthesizeSpeech({ text, language });

    // Placeholder response
    console.warn(
      "TTS generation not yet implemented. Text to synthesize:",
      text
    );

    return {
      audioUrl: "", // Would be populated by actual TTS service
      duration: Math.ceil(text.split(" ").length * 0.5), // Rough estimate
    };
  } catch (error) {
    console.error("Speech generation error:", error);
    throw new Error(`Failed to generate speech: ${error}`);
  }
}

/**
 * Process a message through the language pipeline
 * Detects language, optionally translates, and returns processed content
 */
export async function processMessageLanguage(
  text: string,
  userLanguage?: string,
  translateToEnglish: boolean = true
): Promise<{
  originalText: string;
  detectedLanguage: string;
  translatedText?: string;
  isTranslated: boolean;
}> {
  try {
    // Detect language if not provided
    const detectedLanguage = userLanguage || (await detectLanguageFromText(text));

    let translatedText: string | undefined;
    let isTranslated = false;

    // Translate to English if needed and language is not English
    if (translateToEnglish && detectedLanguage !== "en" && ENV.enableTranslation) {
      translatedText = await translateText(text, detectedLanguage, "en");
      isTranslated = true;
    }

    return {
      originalText: text,
      detectedLanguage,
      translatedText,
      isTranslated,
    };
  } catch (error) {
    console.error("Message language processing error:", error);
    return {
      originalText: text,
      detectedLanguage: userLanguage || "en",
      isTranslated: false,
    };
  }
}

/**
 * Translate response back to user's language
 */
export async function translateResponseToUserLanguage(
  responseText: string,
  userLanguage: string
): Promise<string> {
  if (userLanguage === "en") {
    return responseText;
  }

  try {
    return await translateText(responseText, "en", userLanguage);
  } catch (error) {
    console.error("Response translation error:", error);
    return responseText; // Return original if translation fails
  }
}
