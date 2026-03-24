import { describe, it, expect } from 'vitest';

// Language detection mock
const languageUtils = {
  detectLanguage: (text: string): string => {
    // Simple mock implementation
    if (/[а-яА-Я]/.test(text)) return 'ru';
    if (/[äöüß]/.test(text)) return 'de';
    if (/[ñáéíóú]/.test(text)) return 'es';
    if (/[swahili|habari|asante]/i.test(text)) return 'sw';
    return 'en';
  },

  translateGreeting: (lang: string): string => {
    const greetings: Record<string, string> = {
      en: 'Hello',
      sw: 'Habari',
      zu: 'Sawubona',
      yo: 'Bawo',
      am: 'Selam',
      fr: 'Bonjour',
    };
    return greetings[lang] || 'Hello';
  },
};

describe('Language Utilities', () => {
  describe('detectLanguage', () => {
    it('should detect English', () => {
      expect(languageUtils.detectLanguage('Hello world')).toBe('en');
    });

    it('should detect Swahili keywords', () => {
      expect(languageUtils.detectLanguage('Habari yako')).toBe('sw');
    });

    it('should detect Russian', () => {
      expect(languageUtils.detectLanguage('Привет мир')).toBe('ru');
    });
  });

  describe('translateGreeting', () => {
    it('should return English greeting', () => {
      expect(languageUtils.translateGreeting('en')).toBe('Hello');
    });

    it('should return Swahili greeting', () => {
      expect(languageUtils.translateGreeting('sw')).toBe('Habari');
    });

    it('should return Zulu greeting', () => {
      expect(languageUtils.translateGreeting('zu')).toBe('Sawubona');
    });

    it('should default to English for unknown language', () => {
      expect(languageUtils.translateGreeting('unknown')).toBe('Hello');
    });
  });
});
