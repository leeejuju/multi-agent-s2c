/**
 * 基础配置与类型定义
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
 * 带有增强 Fetch 功能的核心请求函数
 */
export async function request<T = any>(
  url: string,
  config: RequestConfig = {},
): Promise<T> {
  const { params, timeout = 10000, headers: customHeaders, ...rest } = config;

  // 1. 构建带有查询参数的 URL
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, val]) =>
      searchParams.append(key, String(val)),
    );
  }
  const queryString = searchParams.toString();
  const fullUrl = `${BASE_URL}${url}${queryString ? `?${queryString}` : ""}`;

  // 2. 默认请求头设置
  const headers = new Headers(customHeaders);
  const isFormData =
    typeof FormData !== "undefined" && rest.body instanceof FormData;

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (
    typeof window !== "undefined" &&
    !headers.has("Authorization")
  ) {
    const accessToken = window.localStorage.getItem("access_token");
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  // 3. 超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(fullUrl, {
      ...rest,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 4. 处理 204 No Content 场景
    if (response.status === 204) {
      return {} as T;
    }

    // 5. 统一错误处理
    if (!response.ok) {
      let errorDetail;
      try {
        errorDetail = await response.json();
      } catch {
        errorDetail = { message: `HTTP 错误 ${response.status}` };
      }
      throw new Error(errorDetail.message || "网络请求错误");
    }

    // 6. 根据 Content-Type 解析响应内容
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return (await response.json()) as T;
    }

    return (await response.text()) as unknown as T;
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new Error("请求超时");
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
