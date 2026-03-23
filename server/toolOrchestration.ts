/**
 * Tool Orchestration System
 * Manages external API calls and tool execution for the chatbot
 */

import { invokeLLM } from "./_core/llm";

/**
 * Tool definition interface
 */
export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Available tools for the chatbot
 */
const tools: Record<string, Tool> = {
  weather: {
    name: "weather",
    description:
      "Get current weather information for a location. Returns temperature, conditions, and forecast.",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "City name or coordinates",
        },
      },
      required: ["location"],
    },
    execute: async (args) => {
      // Placeholder for weather API integration
      // In production, call a weather API like OpenWeatherMap
      console.log("Weather tool called with:", args);
      return {
        location: args.location,
        temperature: 25,
        condition: "Sunny",
        forecast: "Clear skies expected",
      };
    },
  },

  news: {
    name: "news",
    description:
      "Get latest news articles. Can filter by topic, region, or language.",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "News topic to search for",
        },
        region: {
          type: "string",
          description: "Geographic region (optional)",
        },
        language: {
          type: "string",
          description: "Language code (optional)",
        },
      },
      required: ["topic"],
    },
    execute: async (args) => {
      // Placeholder for news API integration
      // In production, call a news API like NewsAPI
      console.log("News tool called with:", args);
      return {
        articles: [
          {
            title: "Sample News Article",
            source: "News Agency",
            date: new Date().toISOString(),
            summary: "This is a sample news article",
          },
        ],
      };
    },
  },

  search: {
    name: "search",
    description: "Search the web for information on a given topic.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query",
        },
        language: {
          type: "string",
          description: "Language code for search results (optional)",
        },
      },
      required: ["query"],
    },
    execute: async (args) => {
      // Placeholder for web search integration
      // In production, call a search API like Google Custom Search
      console.log("Search tool called with:", args);
      return {
        results: [
          {
            title: "Search Result 1",
            url: "https://example.com/1",
            snippet: "This is a sample search result",
          },
        ],
      };
    },
  },

  calculator: {
    name: "calculator",
    description: "Perform mathematical calculations.",
    parameters: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description: "Mathematical expression to evaluate",
        },
      },
      required: ["expression"],
    },
    execute: async (args) => {
      try {
        // Safe mathematical expression evaluation without eval()
        const result = safeMathEval(args.expression as string);
        return { result, expression: args.expression };
      } catch (error) {
        return { error: "Invalid mathematical expression" };
      }
    },
  },
};

/**
 * Get available tools
 */
export function getAvailableTools(): Tool[] {
  return Object.values(tools);
}

/**
 * Get tool by name
 */
export function getTool(name: string): Tool | null {
  return tools[name] || null;
}

/**
 * Execute a tool with given arguments
 */
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const tool = getTool(toolName);
  if (!tool) {
    throw new Error(`Tool not found: ${toolName}`);
  }

  try {
    return await tool.execute(args);
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    throw error;
  }
}

/**
 * Process LLM response with tool calls
 * Executes any tools called by the LLM and returns results
 */
export async function processToolCalls(
  llmResponse: any
): Promise<{
  toolResults: Array<{
    toolName: string;
    args: Record<string, unknown>;
    result: unknown;
  }>;
  hasToolCalls: boolean;
}> {
  const toolResults: Array<{
    toolName: string;
    args: Record<string, unknown>;
    result: unknown;
  }> = [];

  // Check if response contains tool calls
  if (llmResponse.choices?.[0]?.message?.tool_calls) {
    const toolCalls = llmResponse.choices[0].message.tool_calls;

    for (const toolCall of toolCalls) {
      try {
        const toolName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments || "{}");

        const result = await executeTool(toolName, args);
        toolResults.push({
          toolName,
          args,
          result,
        });
      } catch (error) {
        console.error("Error processing tool call:", error);
        toolResults.push({
          toolName: toolCall.function.name,
          args: {},
          result: { error: String(error) },
        });
      }
    }
  }

  return {
    toolResults,
    hasToolCalls: toolResults.length > 0,
  };
}

/**
 * Generate LLM response with tool support
 * Allows the LLM to call tools and process results
 */
export async function generateResponseWithTools(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  enableTools: boolean = true
): Promise<{
  response: string;
  toolCalls: Array<{
    toolName: string;
    args: Record<string, unknown>;
    result: unknown;
  }>;
}> {
  const llmMessages = [
    {
      role: "system",
      content: systemPrompt,
    },
    ...messages,
  ];

  const llmOptions: any = {
    messages: llmMessages,
  };

  // Add tool definitions if enabled
  if (enableTools) {
    llmOptions.tools = getAvailableTools().map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
    llmOptions.tool_choice = "auto";
  }

  try {
    const response = await invokeLLM(llmOptions);

    // Process tool calls if any
    const { toolResults } = await processToolCalls(response);

    // Get the final response text
    const responseText =
      typeof response.choices[0]?.message?.content === "string"
        ? response.choices[0].message.content
        : "I encountered an error processing your request.";

    return {
      response: responseText,
      toolCalls: toolResults,
    };
  } catch (error) {
    console.error("Error generating response with tools:", error);
    throw error;
  }
}

/**
 * Register a custom tool
 */
export function registerTool(tool: Tool): void {
  tools[tool.name] = tool;
}

/**
 * Unregister a tool
 */
export function unregisterTool(toolName: string): void {
  delete tools[toolName];
}

/**
 * Safely evaluate a mathematical expression without using eval()
 * Supports: +, -, *, /, parentheses, and decimal numbers
 */
function safeMathEval(expression: string): number {
  // Remove all whitespace
  const sanitized = expression.replace(/\s/g, '');
  
  // Validate characters - only allow numbers, operators, parentheses, and decimal points
  if (!/^[\d+\-*/().]+$/.test(sanitized)) {
    throw new Error('Invalid characters in expression');
  }
  
  // Check for potentially dangerous patterns
  if (sanitized.includes('..') || 
      sanitized.startsWith('.') || 
      sanitized.endsWith('.') ||
      /[+\-*/]{2,}/.test(sanitized)) {
    throw new Error('Malformed expression');
  }
  
  // Tokenize the expression
  const tokens: (string | number)[] = [];
  let currentNum = '';
  
  for (let i = 0; i < sanitized.length; i++) {
    const char = sanitized[i];
    
    if (/[\d.]/.test(char)) {
      currentNum += char;
    } else {
      if (currentNum) {
        const num = parseFloat(currentNum);
        if (isNaN(num)) {
          throw new Error('Invalid number');
        }
        tokens.push(num);
        currentNum = '';
      }
      tokens.push(char);
    }
  }
  
  // Don't forget the last number
  if (currentNum) {
    const num = parseFloat(currentNum);
    if (isNaN(num)) {
      throw new Error('Invalid number');
    }
    tokens.push(num);
  }
  
  // Evaluate using recursive descent parsing
  return evaluateTokens(tokens);
}

/**
 * Evaluate tokens using recursive descent parsing
 * Handles operator precedence: parentheses > multiplication/division > addition/subtraction
 */
function evaluateTokens(tokens: (string | number)[]): number {
  let index = 0;
  
  function parseExpression(): number {
    let value = parseTerm();
    
    while (index < tokens.length) {
      const token = tokens[index];
      if (token === '+') {
        index++;
        value += parseTerm();
      } else if (token === '-') {
        index++;
        value -= parseTerm();
      } else {
        break;
      }
    }
    
    return value;
  }
  
  function parseTerm(): number {
    let value = parseFactor();
    
    while (index < tokens.length) {
      const token = tokens[index];
      if (token === '*') {
        index++;
        value *= parseFactor();
      } else if (token === '/') {
        index++;
        const divisor = parseFactor();
        if (divisor === 0) {
          throw new Error('Division by zero');
        }
        value /= divisor;
      } else {
        break;
      }
    }
    
    return value;
  }
  
  function parseFactor(): number {
    const token = tokens[index];
    
    if (typeof token === 'number') {
      index++;
      return token;
    }
    
    if (token === '(') {
      index++;
      const value = parseExpression();
      if (tokens[index] !== ')') {
        throw new Error('Missing closing parenthesis');
      }
      index++;
      return value;
    }
    
    if (token === '-') {
      index++;
      return -parseFactor();
    }
    
    throw new Error('Unexpected token');
  }
  
  const result = parseExpression();
  
  if (index !== tokens.length) {
    throw new Error('Unexpected token at end of expression');
  }
  
  return result;
}
