/**
 * Base configuration and type definitions
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
}

export type RequestConfig = RequestInit & {
  params?: Record<string, string | number>;
  timeout?: number;
};

/**
 * Core request function with enhanced fetch capabilities
 */
export async function request<T = any>(
  url: string,
  config: RequestConfig = {},
): Promise<T> {
  const { params, timeout = 10000, headers: customHeaders, ...rest } = config;

  // 1. Build URL with query parameters
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, val]) =>
      searchParams.append(key, String(val)),
    );
  }
  const queryString = searchParams.toString();
  const fullUrl = `${BASE_URL}${url}${queryString ? `?${queryString}` : ""}`;

  // 2. Default headers
  const headers = new Headers({
    "Content-Type": "application/json",
    ...customHeaders,
  });

  // 3. Timeout control
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(fullUrl, {
      ...rest,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 4. Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    // 5. Unified error handling
    if (!response.ok) {
      let errorDetail;
      try {
        errorDetail = await response.json();
      } catch {
        errorDetail = { message: `HTTP Error ${response.status}` };
      }
      throw new Error(errorDetail.message || "Network Error");
    }

    // 6. Parse response based on Content-Type
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return (await response.json()) as T;
    }

    return (await response.text()) as unknown as T;
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new Error("Request Timeout");
    }
    throw error;
  }
}

// Convenience helper methods
export const get = <T>(url: string, config?: RequestConfig) =>
  request<T>(url, { ...config, method: "GET" });

export const post = <T>(url: string, data?: any, config?: RequestConfig) =>
  request<T>(url, {
    ...config,
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });

export const put = <T>(url: string, data?: any, config?: RequestConfig) =>
  request<T>(url, {
    ...config,
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
  });

export const del = <T>(url: string, config?: RequestConfig) =>
  request<T>(url, { ...config, method: "DELETE" });

// Backwards compatibility or alternative export
export { request as http };
