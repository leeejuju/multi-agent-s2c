import { useAuthStore } from "@/store/auth";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

function handleUnauthorized() {
  useAuthStore.getState().clearAuth();
  if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
    window.location.href = "/login";
  }
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  message?: string;
}

export type RequestConfig = RequestInit & {
  params?: Record<string, string | number>;
  timeout?: number;
};

export async function request<T = unknown>(
  url: string,
  config: RequestConfig = {},
): Promise<T> {
  const { params, timeout = 10000, headers: customHeaders, ...rest } = config;

  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
  }

  const queryString = searchParams.toString();
  const fullUrl = `${BASE_URL}${url}${queryString ? `?${queryString}` : ""}`;
  const headers = new Headers(customHeaders);
  const isFormData =
    typeof FormData !== "undefined" && rest.body instanceof FormData;

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (typeof window !== "undefined" && !headers.has("Authorization")) {
    const accessToken = useAuthStore.getState().token;
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(fullUrl, {
      ...rest,
      headers,
      signal: controller.signal,
    });

    window.clearTimeout(timeoutId);

    if (response.status === 401) {
      handleUnauthorized();
    }

    if (response.status === 204) {
      return {} as T;
    }

    if (!response.ok) {
      let errorDetail: { detail?: unknown; message?: string } = {};
      try {
        errorDetail = (await response.json()) as {
          detail?: unknown;
          message?: string;
        };
      } catch {
        errorDetail = { message: `HTTP error ${response.status}` };
      }
      throw new Error(formatApiError(errorDetail, response.status));
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return (await response.json()) as T;
    }

    return (await response.text()) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function formatApiError(
  errorDetail: { detail?: unknown; message?: string },
  status: number,
) {
  if (errorDetail.message) {
    return errorDetail.message;
  }

  if (typeof errorDetail.detail === "string") {
    return errorDetail.detail;
  }

  if (Array.isArray(errorDetail.detail)) {
    const messages = errorDetail.detail
      .map((item) => {
        if (
          item &&
          typeof item === "object" &&
          "msg" in item &&
          typeof item.msg === "string"
        ) {
          return item.msg;
        }
        return "";
      })
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  return `HTTP error ${status}`;
}

export const get = <T>(url: string, config?: RequestConfig) =>
  request<T>(url, { ...config, method: "GET" });

export const post = <T>(url: string, data?: unknown, config?: RequestConfig) =>
  request<T>(url, {
    ...config,
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });

export const postForm = <T>(
  url: string,
  data: FormData,
  config?: RequestConfig,
) =>
  request<T>(url, {
    ...config,
    method: "POST",
    body: data,
  });

export const put = <T>(url: string, data?: unknown, config?: RequestConfig) =>
  request<T>(url, {
    ...config,
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
  });

export const del = <T>(url: string, config?: RequestConfig) =>
  request<T>(url, { ...config, method: "DELETE" });

export type ToolStreamStatus =
  | "started"
  | "updated"
  | "completed"
  | "failed"
  | "searching"
  | "searched";

export type ToolStreamEvent = {
  type: "tool";
  status: ToolStreamStatus;
  tool_call_id: string;
  tool_name: string;
  title?: string;
  query?: string;
  source?: string;
  search_scope?: string | string[];
  search_scopes?: string[];
  result_items?: string[];
  result_count?: number;
  conversation_id?: string;
};

type StreamCallbacks = {
  onToken: (token: string) => void;
  onDone: (data: Record<string, unknown>) => void;
  onError: (err: Error) => void;
  onToolEvent?: (event: ToolStreamEvent) => void;
};

const toolStatuses: ToolStreamStatus[] = [
  "started",
  "updated",
  "completed",
  "failed",
  "searching",
  "searched",
];

function toStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((item): item is string => typeof item === "string");
  return items.length ? items : undefined;
}

function normalizeToolEvent(data: Record<string, unknown>): ToolStreamEvent | null {
  if (
    data.type !== "tool" ||
    typeof data.tool_call_id !== "string" ||
    typeof data.status !== "string" ||
    !toolStatuses.includes(data.status as ToolStreamStatus)
  ) {
    return null;
  }

  return {
    type: "tool",
    status: data.status as ToolStreamStatus,
    tool_call_id: data.tool_call_id,
    tool_name: typeof data.tool_name === "string" ? data.tool_name : "tool_call",
    title: typeof data.title === "string" ? data.title : undefined,
    query: typeof data.query === "string" ? data.query : undefined,
    source: typeof data.source === "string" ? data.source : undefined,
    search_scope:
      typeof data.search_scope === "string" || Array.isArray(data.search_scope)
        ? (data.search_scope as string | string[])
        : undefined,
    search_scopes: toStringArray(data.search_scopes),
    result_items: toStringArray(data.result_items),
    result_count:
      typeof data.result_count === "number" ? data.result_count : undefined,
    conversation_id:
      typeof data.conversation_id === "string" ? data.conversation_id : undefined,
  };
}

export function requestStream(
  url: string,
  body: unknown,
  callbacks: StreamCallbacks,
  timeout = 60000,
): { abort: () => void } {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeout);

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");

  if (typeof window !== "undefined") {
    const token = useAuthStore.getState().token;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  void fetch(`${BASE_URL}${url}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: controller.signal,
  })
    .then(async (response) => {
      window.clearTimeout(timeoutId);

      if (response.status === 401) {
        handleUnauthorized();
      }

      if (!response.ok) {
        const errorDetail = await response
          .json()
          .catch(() => ({ message: `HTTP ${response.status}` }));
        throw new Error(errorDetail.message || "Request failed");
      }

      if (!response.body) {
        throw new Error("Streaming response is empty");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let doneReading = false;

      while (!doneReading) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const jsonLine = line.trim();
          if (!jsonLine) {
            continue;
          }

          try {
            const data = JSON.parse(jsonLine) as Record<string, unknown>;
            const token =
              typeof data.content === "string"
                ? data.content
                : typeof data.response === "string"
                  ? data.response
                  : "";
            if (
              (data.type === "token" || data.status === "stream") &&
              token
            ) {
              callbacks.onToken(token);
            } else {
              const toolEvent = normalizeToolEvent(data);
              if (toolEvent) {
                callbacks.onToolEvent?.(toolEvent);
                continue;
              }

              if (data.type === "done" || data.status === "done") {
                callbacks.onDone(data);
                doneReading = true;
              } else if (data.type === "error" || data.status === "error") {
                callbacks.onError(
                  new Error(
                    typeof data.message === "string"
                      ? data.message
                      : "Streaming request failed",
                  ),
                );
                doneReading = true;
              } else if (data.type === "metadata" || data.status === "init") {
                callbacks.onDone(data);
              }
            }
          } catch {
            // Ignore malformed JSON lines so a partial chunk does not stop the stream.
          }
        }
      }
    })
    .catch((error: unknown) => {
      window.clearTimeout(timeoutId);
      if (error instanceof DOMException && error.name === "AbortError") {
        callbacks.onError(new Error("Request timed out"));
      } else if (error instanceof Error) {
        callbacks.onError(error);
      } else {
        callbacks.onError(new Error("Request failed"));
      }
    });

  return {
    abort: () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    },
  };
}

export { request as http };
