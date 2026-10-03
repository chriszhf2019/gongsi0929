/**
 * Unified AI Provider Abstraction Layer
 * Supports: Gemini (Google), DeepSeek, Qwen (Alibaba)
 *
 * Design:
 * - Backend holds all API keys (never expose to frontend)
 * - Provider 配置优先从 DB（后台可改）读取，env 作为 fallback
 * - OpenAI-compatible providers (DeepSeek, Qwen) use fetch directly
 * - Gemini uses the official @google/genai SDK
 */
import { GoogleGenAI, Type } from '@google/genai';
import { getConfig } from './db';

export type AIProvider = 'gemini' | 'deepseek' | 'qwen';

const AI_TIMEOUT_MS = 120_000;

interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

const PROVIDER_DEFAULTS: Record<AIProvider, { baseUrl: string; model: string }> = {
  gemini: { baseUrl: '', model: 'gemini-3.7-flash' },
  deepseek: { baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
  qwen: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
};

/**
 * Determine which provider is active.
 * 优先级：DB 中 AI_PROVIDER > env AI_PROVIDER > 'gemini'
 *
 * 注意：前端不再传 provider override（统一由后台控制），
 * 但保留参数签名以保持向后兼容，传入的 override 会被忽略。
 */
export function getActiveProvider(_override?: AIProvider): AIProvider {
  const provider = getConfig('AI_PROVIDER') as AIProvider | undefined;
  if (provider && ['gemini', 'deepseek', 'qwen'].includes(provider)) {
    return provider;
  }
  return 'gemini';
}

/**
 * Get the API key env var name for a provider.
 */
function getApiKeyEnvName(provider: AIProvider): string {
  switch (provider) {
    case 'gemini': return 'GEMINI_API_KEY';
    case 'deepseek': return 'DEEPSEEK_API_KEY';
    case 'qwen': return 'QWEN_API_KEY';
  }
}

/**
 * Get the API key for a provider (DB > env).
 */
function getProviderApiKey(provider: AIProvider): string {
  const envName = getApiKeyEnvName(provider);
  const val = getConfig(envName);
  if (val) return val;
  if (provider === 'gemini') {
    return process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  }
  return '';
}

/**
 * Get the list of providers that have API keys configured.
 * Useful for the frontend to show available options.
 */
export function getAvailableProviders(): { provider: AIProvider; configured: boolean; model: string }[] {
  return (['gemini', 'deepseek', 'qwen'] as AIProvider[]).map((p) => {
    const apiKey = getProviderApiKey(p);
    const modelKey = `${p.toUpperCase()}_MODEL`;
    return {
      provider: p,
      configured: !!apiKey,
      model: getConfig(modelKey) || PROVIDER_DEFAULTS[p].model,
    };
  });
}

/**
 * Get configuration for a given provider.
 * Returns null if the API key is missing.
 */
function getProviderConfig(provider: AIProvider): ProviderConfig | null {
  const defaults = PROVIDER_DEFAULTS[provider];
  const envPrefix = provider.toUpperCase();
  const apiKey = getProviderApiKey(provider);

  if (!apiKey) return null;

  return {
    apiKey,
    baseUrl: getConfig(`${envPrefix}_BASE_URL`) || defaults.baseUrl,
    model: getConfig(`${envPrefix}_MODEL`) || defaults.model,
  };
}

// Lazy-initialized Gemini client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const config = getProviderConfig('gemini');
    if (!config) throw new Error('GEMINI_API_KEY is not configured');
    geminiClient = new GoogleGenAI({
      apiKey: config.apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
      },
    });
  }
  return geminiClient;
}

/**
 * 重置所有 provider 客户端缓存。
 * 后台配置更新后调用，使新配置立刻生效。
 */
export function resetProviderClients(): void {
  geminiClient = null;
}

/**
 * Convert a Gemini-style responseSchema (using Type enums) into a
 * human-readable JSON schema description that can be injected into the
 * prompt for OpenAI-compatible providers.
 */
function schemaToPromptHint(schema: any): string {
  if (!schema) return '';
  try {
    // The Gemini schema uses Type.OBJECT etc. Convert to plain JSON schema.
    const converted = convertGeminiSchema(schema);
    return `\n\n【返回 JSON 结构要求】请严格按照以下 JSON Schema 返回：\n${JSON.stringify(converted, null, 2)}`;
  } catch {
    return '';
  }
}

function convertGeminiSchema(schema: any): any {
  if (!schema || typeof schema !== 'object') return schema;
  const result: any = {};

  if (schema.type) {
    // Map Gemini Type enum to JSON schema type string
    const typeMap: Record<number, string> = {
      1: 'string',  // Type.STRING
      2: 'number',  // Type.NUMBER
      3: 'integer', // Type.INTEGER
      4: 'boolean', // Type.BOOLEAN
      5: 'array',   // Type.ARRAY
      6: 'object',  // Type.OBJECT
    };
    result.type = typeof schema.type === 'string' ? schema.type : typeMap[schema.type] || 'string';
  }

  if (schema.properties) {
    result.properties = {};
    for (const [key, value] of Object.entries(schema.properties)) {
      result.properties[key] = convertGeminiSchema(value);
    }
  }

  if (schema.items) {
    result.items = convertGeminiSchema(schema.items);
  }

  if (schema.required) {
    result.required = schema.required;
  }

  if (schema.description) {
    result.description = schema.description;
  }

  if (schema.enum) {
    result.enum = schema.enum;
  }

  return result;
}

/**
 * Call an OpenAI-compatible API (DeepSeek / Qwen) for structured JSON output.
 * 所有请求强制 120 秒超时，防止无限等待。
 */
async function callOpenAICompatible(
  config: ProviderConfig,
  prompt: string,
  jsonMode: boolean,
  signal?: AbortSignal
): Promise<string> {
  const body: any = {
    model: config.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    // DeepSeek / Qwen 默认 max_tokens 偏小（4096），不足以承载完整的企业全景 JSON。
    // 显式设为 8192，确保 12 个维度的结构化输出不被截断。
    max_tokens: 8192,
  };

  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  // 外部 signal 也要合并（外部 abort 时同步取消）；once:true 确保只触发一次
  const finalSignal = signal
    ? (() => { signal.addEventListener('abort', () => controller.abort(), { once: true }); return signal; })()
    : controller.signal;

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: finalSignal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}

/**
 * Generate structured JSON output from the active AI provider.
 *
 * @param prompt The instruction prompt
 * @param responseSchema Gemini-style response schema (used for Gemini directly,
 *                       converted to a prompt hint for OpenAI-compatible providers)
 * @param provider Optional runtime provider override
 */
/**
 * 将 Promise 包装为带超时上限的竞速（Promise.race）。
 *
 * 注意：Gemini SDK 的 generateContent 并不直接接受 AbortSignal，之前的实现
 * 创建 AbortController 后只调用 abort() 却没有把 signal 接到 SDK 上，导致
 * 超时形同虚设、请求可能永久挂起。这里改用「超时 Promise 拒绝」与目标 Promise
 * 竞速，确保在 ms 毫秒后必定 reject（ETIMEDOUT），对任意 Provider 均生效。
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(Object.assign(new Error(`AI call timed out after ${ms}ms`), { code: 'ETIMEDOUT' }));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export async function generateStructuredJSON(
  prompt: string,
  responseSchema?: any,
  provider?: AIProvider
): Promise<string> {
  const activeProvider = getActiveProvider(provider);

  if (activeProvider === 'gemini') {
    const ai = getGeminiClient();
    const config = getProviderConfig('gemini')!;
    const response = await withTimeout(
      ai.models.generateContent({
        model: config.model,
        contents: prompt,
        config: responseSchema
          ? {
              responseMimeType: 'application/json',
              responseSchema,
            }
          : { responseMimeType: 'application/json' },
      }),
      AI_TIMEOUT_MS
    );
    return response.text || '';
  }

  const config = getProviderConfig(activeProvider);
  if (!config) {
    throw new Error(`${activeProvider.toUpperCase()}_API_KEY is not configured`);
  }

  const schemaHint = schemaToPromptHint(responseSchema);
  const enhancedPrompt = responseSchema
    ? `${prompt}${schemaHint}\n\n请仅返回符合上述结构的 JSON，不要添加任何解释性文字。`
    : `${prompt}\n\n请以 JSON 格式返回。`;

  return callOpenAICompatible(config, enhancedPrompt, true);
}

/**
 * Generate free-form text output from the active AI provider.
 * Used for the Copilot Q&A endpoint.
 */
export async function generateText(
  prompt: string,
  provider?: AIProvider
): Promise<string> {
  const activeProvider = getActiveProvider(provider);

  if (activeProvider === 'gemini') {
    const ai = getGeminiClient();
    const config = getProviderConfig('gemini')!;
    const response = await withTimeout(
      ai.models.generateContent({
        model: config.model,
        contents: prompt,
      }),
      AI_TIMEOUT_MS
    );
    return response.text || '';
  }

  const config = getProviderConfig(activeProvider);
  if (!config) {
    throw new Error(`${activeProvider.toUpperCase()}_API_KEY is not configured`);
  }

  return callOpenAICompatible(config, prompt, false);
}

export { Type };
