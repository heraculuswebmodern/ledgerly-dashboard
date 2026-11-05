import type { ApiErrorBody } from "@/lib/contracts";

/** Error thrown for any non-2xx API response, carrying field-level messages when present. */
export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

type Query = Record<string, string | number | readonly string[] | undefined | null>;

export function toSearchParams(query: Query = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(","));
    } else {
      params.set(key, String(value));
    }
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
  const response = await fetch(`/api${path}${toSearchParams(query)}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
    cache: "no-store",
  });

  if (response.status === 401 && typeof window !== "undefined" && !path.startsWith("/auth/login")) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    // Hard navigation: this runs outside React, and it drops all cached client state.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/login?next=${next}&expired=1`);
  }

  if (!response.ok) {
    let parsed: ApiErrorBody | null = null;
    try {
      parsed = (await response.json()) as ApiErrorBody;
    } catch {
      // Non-JSON error body.
    }
    throw new ApiClientError(
      response.status,
      parsed?.error.code ?? "http_error",
      parsed?.error.message ?? `Request failed (${response.status})`,
      parsed?.error.fields,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>("GET", path, undefined, query),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  delete: <T = void>(path: string) => request<T>("DELETE", path),
};
