import { useAuthStore } from "@/store/auth";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export function handleUnauthorized() {
  useAuthStore.getState().clearAuth();
  if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
    window.location.href = "/login";
  }
}

export type RequestConfig = RequestInit & {
  timeout?: number;
};

export async function request<T = unknown>(
  url: string,
  config: RequestConfig = {},
): Promise<T> {
  const {
    timeout = 10000,
    headers: customHeaders,
    signal: externalSignal,
    ...rest
  } = config;
  const headers = new Headers(customHeaders);

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (typeof window !== "undefined" && !headers.has("Authorization")) {
    const accessToken = useAuthStore.getState().token;
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  const controller = new AbortController();
  let timedOut = false;
  const abortFromExternalSignal = () => controller.abort();
  if (externalSignal?.aborted) {
    controller.abort();
  } else {
    externalSignal?.addEventListener("abort", abortFromExternalSignal, {
      once: true,
    });
  }

  const timeoutId = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...rest,
      headers,
      signal: controller.signal,
    });

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
      throw new Error(timedOut ? "Request timed out" : "Request aborted");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", abortFromExternalSignal);
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
    body: data === undefined ? undefined : JSON.stringify(data),
  });
