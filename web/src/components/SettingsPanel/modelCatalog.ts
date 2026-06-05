import type { ModelProviderKey } from "./types";

type ModelVariant = {
  id: string;
  label: string;
  meta?: string;
};

type ModelSeries = {
  description: string;
  title: string;
  variants: ModelVariant[];
};

type ModelProviderCatalog = {
  apiKeyName: string;
  apiKeyUrl: string;
  baseUrl: string;
  docsUrl: string;
  key: ModelProviderKey;
  series: ModelSeries[];
  vendorName: string;
};

export const MODEL_PROVIDER_CATALOG: Record<
  ModelProviderKey,
  ModelProviderCatalog
> = {
  qwen: {
    apiKeyName: "DASHSCOPE_API_KEY",
    apiKeyUrl: "https://help.aliyun.com/zh/model-studio/get-api-key/",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    docsUrl: "https://help.aliyun.com/document_detail/2579562.html",
    key: "qwen",
    vendorName: "Alibaba Cloud Model Studio",
    series: [
      {
        title: "Qwen 3.5",
        description: "Latest commercial Qwen upgrade line for balanced chat and long-context work.",
        variants: [
          { id: "qwen3.5-plus", label: "Qwen 3.5 Plus", meta: "balanced" },
          { id: "qwen3.5-flash", label: "Qwen 3.5 Flash", meta: "fast" },
        ],
      },
      {
        title: "Qwen 3 Max",
        description: "Flagship Qwen3 Max line with thinking and non-thinking modes.",
        variants: [
          { id: "qwen3-max", label: "Qwen 3 Max", meta: "stable" },
          { id: "qwen3-max-2026-01-23", label: "Qwen 3 Max 2026-01-23", meta: "snapshot" },
        ],
      },
      {
        title: "Qwen 3",
        description: "Open and commercial Qwen3 generation for general-purpose text tasks.",
        variants: [
          { id: "qwen3", label: "Qwen 3", meta: "general" },
          { id: "qwen3-coder-plus", label: "Qwen 3 Coder Plus", meta: "code" },
        ],
      },
    ],
  },
  deepseek: {
    apiKeyName: "DEEPSEEK_API_KEY",
    apiKeyUrl: "https://platform.deepseek.com/api_keys",
    baseUrl: "https://api.deepseek.com",
    docsUrl: "https://api-docs.deepseek.com/zh-cn/",
    key: "deepseek",
    vendorName: "DeepSeek",
    series: [
      {
        title: "DeepSeek V4",
        description: "Current list-model examples expose the V4 Pro and Flash model IDs.",
        variants: [
          { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro", meta: "pro" },
          { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash", meta: "fast" },
        ],
      },
      {
        title: "DeepSeek Reasoner",
        description: "Reasoning endpoint with exposed reasoning content in API responses.",
        variants: [
          { id: "deepseek-reasoner", label: "DeepSeek Reasoner", meta: "reasoning" },
        ],
      },
      {
        title: "DeepSeek Chat",
        description: "General chat-compatible model alias retained for broad SDK compatibility.",
        variants: [
          { id: "deepseek-chat", label: "DeepSeek Chat", meta: "chat" },
        ],
      },
    ],
  },
  doubao: {
    apiKeyName: "ARK_API_KEY",
    apiKeyUrl: "https://console.volcengine.com/ark/region:ark+cn-beijing/apikey",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    docsUrl: "https://www.volcengine.com/docs/82379/1399008",
    key: "doubao",
    vendorName: "Volcano Engine Ark",
    series: [
      {
        title: "Doubao Seed 2.0",
        description: "Current Ark examples use Doubao Seed 2.0 model IDs for Responses API calls.",
        variants: [
          { id: "doubao-seed-2-0-lite-260215", label: "Doubao Seed 2.0 Lite", meta: "responses" },
          { id: "doubao-seed-2-0-pro", label: "Doubao Seed 2.0 Pro", meta: "pro" },
        ],
      },
      {
        title: "Doubao 1.5",
        description: "Earlier Doubao text and vision line still referenced in Ark guides.",
        variants: [
          { id: "doubao-1-5-pro-32k-250115", label: "Doubao 1.5 Pro 32K", meta: "text" },
          { id: "doubao-1-5-lite-32k-250115", label: "Doubao 1.5 Lite 32K", meta: "fast" },
          { id: "doubao-1-5-vision", label: "Doubao 1.5 Vision", meta: "vision" },
        ],
      },
    ],
  },
  kimi: {
    apiKeyName: "MOONSHOT_API_KEY",
    apiKeyUrl: "https://platform.moonshot.cn/",
    baseUrl: "https://api.moonshot.cn/v1",
    docsUrl: "https://platform.moonshot.cn/docs/intro",
    key: "kimi",
    vendorName: "Moonshot AI",
    series: [
      {
        title: "Kimi K2.6",
        description: "Latest Kimi model advertised for stronger long-horizon coding and agent execution.",
        variants: [
          { id: "kimi-k2.6", label: "Kimi K2.6", meta: "latest" },
        ],
      },
      {
        title: "Kimi K2.5",
        description: "Multimodal Kimi line for text, vision, thinking, chat, and agent work.",
        variants: [
          { id: "kimi-k2.5", label: "Kimi K2.5", meta: "multimodal" },
        ],
      },
      {
        title: "Kimi K2",
        description: "K2 preview, turbo, and thinking variants for coding and agent tasks.",
        variants: [
          { id: "kimi-k2-0905-preview", label: "Kimi K2 0905 Preview", meta: "preview" },
          { id: "kimi-k2-turbo-preview", label: "Kimi K2 Turbo Preview", meta: "fast" },
          { id: "kimi-k2-thinking", label: "Kimi K2 Thinking", meta: "reasoning" },
          { id: "kimi-k2-thinking-turbo", label: "Kimi K2 Thinking Turbo", meta: "fast reasoning" },
        ],
      },
      {
        title: "Moonshot V1",
        description: "First-generation Moonshot text models sorted by context size.",
        variants: [
          { id: "moonshot-v1-128k", label: "Moonshot V1 128K", meta: "128k" },
          { id: "moonshot-v1-32k", label: "Moonshot V1 32K", meta: "32k" },
          { id: "moonshot-v1-8k", label: "Moonshot V1 8K", meta: "8k" },
        ],
      },
    ],
  },
  zhipu: {
    apiKeyName: "ZHIPU_API_KEY",
    apiKeyUrl: "https://open.bigmodel.cn/usercenter/proj-mgmt/apikeys",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    docsUrl: "https://docs.bigmodel.cn/cn/api/introduction",
    key: "zhipu",
    vendorName: "Zhipu AI / Z.ai",
    series: [
      {
        title: "GLM 4.7",
        description: "Latest official GLM flagship series for agentic coding and tool workflows.",
        variants: [
          { id: "glm-4.7", label: "GLM 4.7", meta: "flagship" },
          { id: "glm-4.7-flashx", label: "GLM 4.7 FlashX", meta: "fast" },
        ],
      },
      {
        title: "GLM 4.6",
        description: "Long-context GLM line with 200K context and strong tool calling support.",
        variants: [
          { id: "glm-4.6", label: "GLM 4.6", meta: "text" },
          { id: "glm-4.6v", label: "GLM 4.6V", meta: "vision" },
          { id: "glm-4.6v-flashx", label: "GLM 4.6V FlashX", meta: "fast vision" },
        ],
      },
      {
        title: "GLM 4.5",
        description: "Previous reasoning, coding, and agent generation line.",
        variants: [
          { id: "glm-4.5", label: "GLM 4.5", meta: "text" },
          { id: "glm-4.5-air", label: "GLM 4.5 Air", meta: "efficient" },
        ],
      },
    ],
  },
  minimax: {
    apiKeyName: "MINIMAX_API_KEY",
    apiKeyUrl: "https://platform.minimaxi.com/user-center/basic-information/interface-key",
    baseUrl: "https://api.minimaxi.com/v1",
    docsUrl: "https://www.minimaxi.com/docs/api",
    key: "minimax",
    vendorName: "MiniMax",
    series: [
      {
        title: "MiniMax M3",
        description: "Newest MiniMax frontier model for coding, agents, and long context.",
        variants: [
          { id: "MiniMax-M3", label: "MiniMax M3", meta: "1M context" },
        ],
      },
      {
        title: "MiniMax M2.7",
        description: "Production text model with standard and highspeed variants.",
        variants: [
          { id: "MiniMax-M2.7", label: "MiniMax M2.7", meta: "standard" },
          { id: "MiniMax-M2.7-highspeed", label: "MiniMax M2.7 Highspeed", meta: "fast" },
        ],
      },
      {
        title: "MiniMax M2.5",
        description: "Cost-effective M2 generation for complex text tasks.",
        variants: [
          { id: "MiniMax-M2.5", label: "MiniMax M2.5", meta: "standard" },
          { id: "MiniMax-M2.5-highspeed", label: "MiniMax M2.5 Highspeed", meta: "fast" },
        ],
      },
    ],
  },
  google: {
    apiKeyName: "GEMINI_API_KEY",
    apiKeyUrl: "https://aistudio.google.com/apikey",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    docsUrl: "https://ai.google.dev/gemini-api/docs/api-key?hl=zh-cn",
    key: "google",
    vendorName: "Google Gemini API",
    series: [
      {
        title: "Gemini 3.5",
        description: "Stable Gemini Flash line for sustained frontier performance.",
        variants: [
          { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash", meta: "stable" },
        ],
      },
      {
        title: "Gemini 3.1",
        description: "Preview and live models for advanced reasoning and real-time work.",
        variants: [
          { id: "gemini-3.1-pro", label: "Gemini 3.1 Pro", meta: "preview" },
          { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite", meta: "stable" },
          { id: "gemini-3.1-flash-live", label: "Gemini 3.1 Flash Live", meta: "live" },
        ],
      },
      {
        title: "Gemini 3",
        description: "Gemini 3 generation preview models for complex multimodal tasks.",
        variants: [
          { id: "gemini-3-pro-preview", label: "Gemini 3 Pro Preview", meta: "preview" },
          { id: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview", meta: "preview" },
        ],
      },
    ],
  },
  openai: {
    apiKeyName: "OPENAI_API_KEY",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    baseUrl: "https://api.openai.com/v1",
    docsUrl: "https://platform.openai.com/docs/quickstart?api-mode=chat",
    key: "openai",
    vendorName: "OpenAI",
    series: [
      {
        title: "GPT 5.5",
        description: "Current flagship OpenAI model for complex reasoning and coding.",
        variants: [
          { id: "gpt-5.5", label: "GPT 5.5", meta: "flagship" },
        ],
      },
      {
        title: "GPT 5.4",
        description: "More affordable GPT 5 generation with mini and nano variants.",
        variants: [
          { id: "gpt-5.4", label: "GPT 5.4", meta: "standard" },
          { id: "gpt-5.4-mini", label: "GPT 5.4 Mini", meta: "mini" },
          { id: "gpt-5.4-nano", label: "GPT 5.4 Nano", meta: "nano" },
        ],
      },
    ],
  },
};

function readVersionParts(value: string): number[] {
  return (value.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
}

export function sortModelSeries(series: ModelSeries[]) {
  return [...series].sort((left, right) => {
    const leftParts = readVersionParts(left.title);
    const rightParts = readVersionParts(right.title);
    const maxLength = Math.max(leftParts.length, rightParts.length);

    for (let index = 0; index < maxLength; index += 1) {
      const diff = (rightParts[index] ?? 0) - (leftParts[index] ?? 0);
      if (diff !== 0) return diff;
    }

    return left.title.localeCompare(right.title);
  });
}
