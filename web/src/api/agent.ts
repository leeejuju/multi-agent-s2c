import { useAuthStore } from "@/store/auth";

import { API_BASE_URL, get, handleUnauthorized, post } from "./index";

export interface AgentSummary {
  id: string;
  name: string;
  description: string;
}

export interface ModelSummary {
  id: string;
  name: string;
  provider: string;
  is_default: boolean;
  is_fallback: boolean;
  is_flash: boolean;
}

export interface ModelListResponse {
  default_model: string;
  fallback_model: string;
  flash_model: string;
  image_model: string;
  models: ModelSummary[];
}

export interface ThreadCreateRequest {
  title?: string;
  summary?: string;
  agent_id: string;
  metadata?: Record<string, unknown>;
}

export interface ThreadResponse {
  uid: string;
  title: string;
  thread_id: string;
  agent_id: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
}

export interface AgentRunCreateRequest {
  query?: string;
  agent_id: string;
  thread_id: string;
  thread_metadata: Record<string, unknown>;
  image_content?: string | null;
  is_resume?: unknown;
  parent_run_id?: string | null;
}

export interface AgentRunResponse {
  run_id: string;
  thread_id: string;
  status: string;
  request_id: string;
  stream_url: string;
}

export interface AgentRunEvent {
  created_at?: string;
  error?: string;
  payload?: unknown;
  run_id: string;
  scope?: "agent_run";
  status?: string;
  thread_id?: string;
  type: string;
}

export interface AgentRunStreamMessage {
  data: AgentRunEvent;
  event: string;
  id?: string;
}

interface SubscribeAgentRunEventsOptions {
  onEvent: (message: AgentRunStreamMessage) => void;
  signal: AbortSignal;
}

function resolveStreamUrl(streamUrl: string) {
  if (/^https?:\/\//.test(streamUrl)) return streamUrl;

  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  if (streamUrl.startsWith("/api/") && baseUrl.endsWith("/api")) {
    return `${baseUrl.slice(0, -4)}${streamUrl}`;
  }
  if (streamUrl.startsWith("/")) return streamUrl;
  return `${baseUrl}/${streamUrl}`;
}

function parseSseFrame(frame: string): AgentRunStreamMessage | null {
  let event = "message";
  let id: string | undefined;
  const dataLines: string[] = [];

  for (const line of frame.split("\n")) {
    if (!line || line.startsWith(":")) continue;
    const separatorIndex = line.indexOf(":");
    const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex);
    let value = separatorIndex === -1 ? "" : line.slice(separatorIndex + 1);
    if (value.startsWith(" ")) value = value.slice(1);

    if (field === "event") event = value;
    if (field === "id") id = value;
    if (field === "data") dataLines.push(value);
  }

  if (dataLines.length === 0) return null;
  const data = JSON.parse(dataLines.join("\n")) as AgentRunEvent;
  return { data, event, id };
}

export async function subscribeAgentRunEvents(
  streamUrl: string,
  { onEvent, signal }: SubscribeAgentRunEventsOptions,
) {
  const headers = new Headers({ Accept: "text/event-stream" });
  const accessToken = useAuthStore.getState().token;
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(resolveStreamUrl(streamUrl), { headers, signal });
  if (response.status === 401) handleUnauthorized();
  if (!response.ok) {
    throw new Error(`Agent Run 事件流请求失败：${response.status}`);
  }
  if (!response.body) {
    throw new Error("Agent Run 事件流没有可读内容");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      buffer = buffer.replace(/\r\n/g, "\n");

      let frameEnd = buffer.indexOf("\n\n");
      while (frameEnd !== -1) {
        const message = parseSseFrame(buffer.slice(0, frameEnd));
        buffer = buffer.slice(frameEnd + 2);
        if (message) onEvent(message);
        frameEnd = buffer.indexOf("\n\n");
      }

      if (done) break;
    }

    const message = parseSseFrame(buffer.trim());
    if (message) onEvent(message);
  } finally {
    reader.releaseLock();
  }
}

export const agentApi = {
  getAgents() {
    return get<AgentSummary[]>("/chat/agents");
  },

  getModels() {
    return get<ModelListResponse>("/models");
  },

  createThread(payload: ThreadCreateRequest) {
    return post<ThreadResponse>("/chat/thread", payload);
  },

  createAgentRun(payload: AgentRunCreateRequest) {
    return post<AgentRunResponse>("/agent/runs", payload);
  },
};
