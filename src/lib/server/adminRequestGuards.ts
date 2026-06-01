import { assertRateLimit, assertSameOriginRequest, type RequestGuardResult } from "./requestGuards.ts";

const ADMIN_MUTATION_WINDOW_MS = 60_000;
const ADMIN_MUTATION_LIMIT = 180;

export function assertAdminMutationAllowed(request: Request): RequestGuardResult {
  const origin = assertSameOriginRequest(request, {
    error: "admin_origin_rejected",
    message: "La solicitud admin no coincide con el origen esperado.",
  });
  if (!origin.ok) return origin;
  const key = request.headers.get("origin") ?? new URL(request.url).host;
  return assertRateLimit(`admin_mutation:${key}`, {
    namespace: "admin_mutation",
    windowMs: ADMIN_MUTATION_WINDOW_MS,
    limit: ADMIN_MUTATION_LIMIT,
    error: "admin_rate_limited",
    message: "Demasiadas acciones admin en poco tiempo. Esperá un momento y volvé a intentar.",
  });
}
