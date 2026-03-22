/**
 * Tests for Tool Orchestration System
 */

import { describe, it, expect } from 'vitest';
import { getAvailableTools, getTool, executeTool } from './toolOrchestration';

describe('Tool Orchestration', () => {
  describe('getAvailableTools', () => {
    it('should return all available tools', () => {
      const tools = getAvailableTools();
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.some(t => t.name === 'calculator')).toBe(true);
      expect(tools.some(t => t.name === 'weather')).toBe(true);
      expect(tools.some(t => t.name === 'news')).toBe(true);
      expect(tools.some(t => t.name === 'search')).toBe(true);
    });
  });

  describe('getTool', () => {
    it('should return a tool by name', () => {
      const tool = getTool('calculator');
      expect(tool).not.toBeNull();
      expect(tool?.name).toBe('calculator');
    });

    it('should return null for non-existent tool', () => {
      const tool = getTool('nonexistent');
      expect(tool).toBeNull();
    });
  });

  describe('calculator tool', () => {
    it('should evaluate simple addition', async () => {
      const result = await executeTool('calculator', { expression: '2 + 2' });
      expect(result).toEqual({ result: 4, expression: '2 + 2' });
    });

    it('should evaluate simple subtraction', async () => {
      const result = await executeTool('calculator', { expression: '10 - 3' });
      expect(result).toEqual({ result: 7, expression: '10 - 3' });
    });

    it('should evaluate simple multiplication', async () => {
      const result = await executeTool('calculator', { expression: '5 * 5' });
      expect(result).toEqual({ result: 25, expression: '5 * 5' });
    });

    it('should evaluate simple division', async () => {
      const result = await executeTool('calculator', { expression: '20 / 4' });
      expect(result).toEqual({ result: 5, expression: '20 / 4' });
    });

    it('should evaluate expressions with parentheses', async () => {
      const result = await executeTool('calculator', { expression: '(2 + 3) * 4' });
      expect(result).toEqual({ result: 20, expression: '(2 + 3) * 4' });
    });

    it('should evaluate expressions with decimals', async () => {
      const result = await executeTool('calculator', { expression: '3.5 + 2.5' });
      expect(result).toEqual({ result: 6, expression: '3.5 + 2.5' });
    });

    it('should handle operator precedence', async () => {
      const result = await executeTool('calculator', { expression: '2 + 3 * 4' });
      expect(result).toEqual({ result: 14, expression: '2 + 3 * 4' });
    });

    it('should handle negative numbers', async () => {
      const result = await executeTool('calculator', { expression: '-5 + 3' });
      expect(result).toEqual({ result: -2, expression: '-5 + 3' });
    });

    it('should handle complex expressions', async () => {
      const result = await executeTool('calculator', { expression: '((10 + 5) * 2 - 5) / 5' });
      expect(result).toEqual({ result: 5, expression: '((10 + 5) * 2 - 5) / 5' });
    });

    it('should reject invalid characters', async () => {
      const result = await executeTool('calculator', { expression: '2 + alert("hack")' });
      expect(result).toHaveProperty('error');
    });

    it('should reject empty expressions', async () => {
      const result = await executeTool('calculator', { expression: '' });
      expect(result).toHaveProperty('error');
    });

    it('should handle division by zero gracefully', async () => {
      const result = await executeTool('calculator', { expression: '10 / 0' });
      expect(result).toHaveProperty('error');
    });
  });

  describe('weather tool', () => {
    it('should return weather data', async () => {
      const result = await executeTool('weather', { location: 'Nairobi' });
      expect(result).toHaveProperty('location');
      expect(result).toHaveProperty('temperature');
      expect(result).toHaveProperty('condition');
    });
  });

  describe('news tool', () => {
    it('should return news articles', async () => {
      const result = await executeTool('news', { topic: 'technology' });
      expect(result).toHaveProperty('articles');
      expect(Array.isArray((result as any).articles)).toBe(true);
    });
  });

  describe('search tool', () => {
    it('should return search results', async () => {
      const result = await executeTool('search', { query: 'test' });
      expect(result).toHaveProperty('results');
      expect(Array.isArray((result as any).results)).toBe(true);
    });
  });
});
