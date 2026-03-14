export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RequestOptions = RequestInit;

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

export async function request<T = unknown>(
  method: HttpMethod,
  url: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers, ...rest } = options;
  const requestHeaders = new Headers(headers);

  const response = await fetch(url, {
    ...rest,
    method,
    headers: requestHeaders,
    body: method === "GET" ? undefined : body ?? undefined,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return parseResponse<T>(response);
}

export function get<T = unknown>(url: string, options?: Omit<RequestOptions, "body">) {
  return request<T>("GET", url, options);
}

export function post<T = unknown>(
  url: string,
  body?: RequestOptions["body"],
  options?: Omit<RequestOptions, "body">,
) {
  return request<T>("POST", url, { ...options, body });
}

export function put<T = unknown>(
  url: string,
  body?: RequestOptions["body"],
  options?: Omit<RequestOptions, "body">,
) {
  return request<T>("PUT", url, { ...options, body });
}

export function patch<T = unknown>(
  url: string,
  body?: RequestOptions["body"],
  options?: Omit<RequestOptions, "body">,
) {
  return request<T>("PATCH", url, { ...options, body });
}

export function del<T = unknown>(url: string, options?: Omit<RequestOptions, "body">) {
  return request<T>("DELETE", url, options);
}
