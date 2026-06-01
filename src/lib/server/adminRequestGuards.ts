interface AdminGuardError {
  ok: false;
  status: 403 | 429;
  error: "admin_origin_rejected" | "admin_rate_limited";
  message: string;
}

type AdminGuardResult = { ok: true } | AdminGuardError;

const mutationBuckets = new Map<string, { count: number; resetAt: number }>();
const ADMIN_MUTATION_WINDOW_MS = 60_000;
const ADMIN_MUTATION_LIMIT = 180;

export function assertAdminMutationAllowed(request: Request): AdminGuardResult {
  const origin = assertSameOrigin(request);
  if (!origin.ok) return origin;
  return checkInMemoryMutationRate(request);
}

function assertSameOrigin(request: Request): AdminGuardResult {
  const origin = request.headers.get("origin");
  if (!origin) return { ok: true };
  const requestUrl = new URL(request.url);
  const originUrl = safeUrl(origin);
  if (!originUrl) {
    return {
      ok: false,
      status: 403,
      error: "admin_origin_rejected",
      message: "La solicitud admin no coincide con el origen esperado.",
    };
  }
  if (originUrl.protocol === requestUrl.protocol && originUrl.host === requestUrl.host) {
    return { ok: true };
  }
  return {
    ok: false,
    status: 403,
    error: "admin_origin_rejected",
    message: "La solicitud admin no coincide con el origen esperado.",
  };
}

function checkInMemoryMutationRate(request: Request): AdminGuardResult {
  const now = Date.now();
  const key = request.headers.get("origin") ?? new URL(request.url).host;
  const bucket = mutationBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    mutationBuckets.set(key, { count: 1, resetAt: now + ADMIN_MUTATION_WINDOW_MS });
    return { ok: true };
  }
  if (bucket.count >= ADMIN_MUTATION_LIMIT) {
    return {
      ok: false,
      status: 429,
      error: "admin_rate_limited",
      message: "Demasiadas acciones admin en poco tiempo. Esperá un momento y volvé a intentar.",
    };
  }
  bucket.count += 1;
  return { ok: true };
}

function safeUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
