export type RequestGuardResult =
  | { ok: true }
  | {
    ok: false;
    status: 403 | 429;
    error: string;
    message: string;
  };

interface SameOriginOptions {
  error?: string;
  message?: string;
}

interface RateLimitOptions {
  namespace: string;
  limit: number;
  windowMs: number;
  error: string;
  message: string;
}

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function assertSameOriginRequest(
  request: Request,
  options: SameOriginOptions = {},
): RequestGuardResult {
  const origin = request.headers.get("origin");
  if (!origin) return { ok: true };
  const requestUrl = new URL(request.url);
  const originUrl = safeUrl(origin);
  if (originUrl && originUrl.protocol === requestUrl.protocol && originUrl.host === requestUrl.host) {
    return { ok: true };
  }
  return {
    ok: false,
    status: 403,
    error: options.error ?? "origin_rejected",
    message: options.message ?? "La solicitud no coincide con el origen esperado.",
  };
}

export function assertRequestRateLimit(request: Request, options: RateLimitOptions): RequestGuardResult {
  return assertRateLimit(`${options.namespace}:${clientIdentifier(request)}`, options);
}

export function assertRateLimit(key: string, options: RateLimitOptions): RequestGuardResult {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { ok: true };
  }
  if (bucket.count >= options.limit) {
    return {
      ok: false,
      status: 429,
      error: options.error,
      message: options.message,
    };
  }
  bucket.count += 1;
  return { ok: true };
}

function clientIdentifier(request: Request): string {
  return firstForwardedFor(request.headers.get("x-forwarded-for")) ??
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("user-agent") ??
    new URL(request.url).host;
}

function firstForwardedFor(value: string | null): string | null {
  const first = value?.split(",")[0]?.trim();
  return first || null;
}

function safeUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
