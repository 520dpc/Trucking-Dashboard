export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown; // JSON object OR FormData
};

async function parseJsonSafe(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const method = options.method ?? "GET";
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(options.headers ?? {}),
  };

  // Only set JSON header if NOT FormData (browser must set the multipart boundary itself)
  if (!isFormData && options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(path, {
    method,
    headers,
    body:
      options.body === undefined
        ? undefined
        : isFormData
        ? (options.body as FormData)
        : JSON.stringify(options.body),
  });

  if (!res.ok) {
    const payload = await parseJsonSafe(res);
    const message =
      (payload as any)?.error ??
      `${method} ${path} failed with status ${res.status}`;
    throw new ApiError(message, res.status, payload);
  }

  // Some endpoints may return empty bodies for DELETE; handle that safely.
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}
