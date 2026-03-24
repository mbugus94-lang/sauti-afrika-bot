import { describe, it, expect } from 'vitest';

// Utility functions to test
const utils = {
  formatPhoneNumber: (phone: string): string => {
    // Remove non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    // Add country code if missing
    if (cleaned.length === 9) {
      return `+254${cleaned}`;
    }
    if (cleaned.length === 10 && cleaned.startsWith('0')) {
      return `+254${cleaned.slice(1)}`;
    }
    return phone.startsWith('+') ? phone : `+${cleaned}`;
  },

  truncateText: (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
  },

  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
};

describe('Utilities', () => {
  describe('formatPhoneNumber', () => {
    it('should format 9-digit Kenyan number', () => {
      expect(utils.formatPhoneNumber('712345678')).toBe('+254712345678');
    });

    it('should format 10-digit number starting with 0', () => {
      expect(utils.formatPhoneNumber('0712345678')).toBe('+254712345678');
    });

    it('should keep number with existing country code', () => {
      expect(utils.formatPhoneNumber('+254712345678')).toBe('+254712345678');
    });

    it('should handle number with spaces and dashes', () => {
      expect(utils.formatPhoneNumber('0712-345-678')).toBe('+254712345678');
    });
  });

  describe('truncateText', () => {
    it('should not truncate short text', () => {
      expect(utils.truncateText('Hello', 10)).toBe('Hello');
    });

    it('should truncate long text with ellipsis', () => {
      expect(utils.truncateText('This is a very long text', 10)).toBe('This is...');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email', () => {
      expect(utils.isValidEmail('test@example.com')).toBe(true);
    });

    it('should reject email without @', () => {
      expect(utils.isValidEmail('testexample.com')).toBe(false);
    });

    it('should reject email without domain', () => {
      expect(utils.isValidEmail('test@')).toBe(false);
    });
  });
});
