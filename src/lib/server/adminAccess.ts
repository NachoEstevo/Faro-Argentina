import { timingSafeEqual } from "node:crypto";

export interface AdminAccessFailure {
  status: 401 | 503;
  error: "admin_not_configured" | "admin_access_required";
  message: string;
}

export function verifyAdminAccess(request: Request): AdminAccessFailure | null {
  const expected = adminAccessCode();
  if (!expected) {
    return {
      status: 503,
      error: "admin_not_configured",
      message: "La bandeja privada todavía no tiene un código de acceso configurado.",
    };
  }
  const provided = request.headers.get("x-faro-admin-code") ?? "";
  if (!safeEqual(provided, expected)) {
    return {
      status: 401,
      error: "admin_access_required",
      message: "Ingresá el código privado para revisar aportes.",
    };
  }
  return null;
}

function adminAccessCode(): string | null {
  return optionalEnv("FARO_ADMIN_ACCESS_CODE") ??
    optionalEnv("ADMIN_ACCESS_CODE") ??
    optionalEnv("INVESTIGATIONS_ACCESS_CODE");
}

function optionalEnv(key: string): string | null {
  const value = process.env[key]?.trim();
  return value ? value : null;
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.byteLength !== rightBuffer.byteLength) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}
