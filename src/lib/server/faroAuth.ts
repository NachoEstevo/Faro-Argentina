export type FaroUserRole = "admin" | "reviewer" | "investigator";

interface ClerkEmailAddress {
  id: string;
  emailAddress: string;
}

interface ClerkCurrentUser {
  emailAddresses: ClerkEmailAddress[];
  primaryEmailAddressId: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  publicMetadata?: unknown;
  privateMetadata?: unknown;
}

interface ClerkServer {
  auth: () => Promise<{ userId: string | null }>;
  currentUser: () => Promise<ClerkCurrentUser | null>;
}

export interface FaroAuthenticatedUser {
  clerkUserId: string;
  email: string;
  displayName: string | null;
  role: FaroUserRole;
}

export type FaroAuthResult =
  | { ok: true; user: FaroAuthenticatedUser }
  | {
    ok: false;
    status: 401 | 403 | 503;
    error: "login_required" | "auth_not_configured" | "reviewer_access_required" | "admin_access_required";
    message: string;
  };

export async function requireFaroUser(): Promise<FaroAuthResult> {
  const testUser = getTestUser();
  if (testUser) return { ok: true, user: testUser };

  if (!isClerkConfigured()) {
    return {
      ok: false,
      status: 503,
      error: "auth_not_configured",
      message: "La cuenta privada todavía no está configurada en este entorno.",
    };
  }

  try {
    const { auth, currentUser } = await loadClerkServer();
    const session = await auth();
    if (!session.userId) {
      return {
        ok: false,
        status: 401,
        error: "login_required",
        message: "Iniciá sesión para sincronizar tus carpetas privadas.",
      };
    }
    const user = await currentUser();
    return {
      ok: true,
      user: {
        clerkUserId: session.userId,
        email: primaryEmail(user) ?? "",
        displayName: displayName(user),
        role: resolveFaroRole(user),
      },
    };
  } catch {
    return {
      ok: false,
      status: 401,
      error: "login_required",
      message: "Iniciá sesión para sincronizar tus carpetas privadas.",
    };
  }
}

export function isFaroReviewer(user: FaroAuthenticatedUser): boolean {
  return user.role === "reviewer" || user.role === "admin";
}

export function isFaroAdmin(user: FaroAuthenticatedUser): boolean {
  return user.role === "admin";
}

export async function requireFaroReviewer(): Promise<FaroAuthResult> {
  const authResult = await requireFaroUser();
  if (!authResult.ok) {
    if (authResult.error === "login_required") {
      return {
        ok: false,
        status: 401,
        error: "login_required",
        message: "Iniciá sesión con una cuenta reviewer o admin para revisar aportes.",
      };
    }
    return authResult;
  }
  if (!isFaroReviewer(authResult.user)) {
    return {
      ok: false,
      status: 403,
      error: "reviewer_access_required",
      message: "Necesitás una cuenta reviewer o admin para revisar aportes.",
    };
  }
  return authResult;
}

export async function requireFaroAdmin(): Promise<FaroAuthResult> {
  const authResult = await requireFaroUser();
  if (!authResult.ok) {
    if (authResult.error === "login_required") {
      return {
        ok: false,
        status: 401,
        error: "login_required",
        message: "Iniciá sesión con una cuenta admin para administrar este espacio.",
      };
    }
    return authResult;
  }
  if (!isFaroAdmin(authResult.user)) {
    return {
      ok: false,
      status: 403,
      error: "admin_access_required",
      message: "Necesitás una cuenta admin para administrar este espacio.",
    };
  }
  return authResult;
}

function isClerkConfigured(): boolean {
  return Boolean(optionalEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY") && optionalEnv("CLERK_SECRET_KEY"));
}

async function loadClerkServer(): Promise<ClerkServer> {
  return await import("@clerk/nextjs/server") as ClerkServer;
}

function resolveFaroRole(user: ClerkCurrentUser | null): FaroUserRole {
  const metadataRole = readMetadataRole(user);
  if (metadataRole) return metadataRole;
  const email = primaryEmail(user);
  if (email && envListIncludes("FARO_ADMIN_EMAILS", email)) return "admin";
  if (email && envListIncludes("FARO_REVIEWER_EMAILS", email)) return "reviewer";
  return "investigator";
}

function readMetadataRole(user: ClerkCurrentUser | null): FaroUserRole | null {
  const publicRole = readRoleValue(user?.publicMetadata);
  if (publicRole) return publicRole;
  return readRoleValue(user?.privateMetadata);
}

function readRoleValue(metadata: unknown): FaroUserRole | null {
  if (!metadata || typeof metadata !== "object" || !("role" in metadata)) return null;
  const value = String((metadata as { role?: unknown }).role ?? "").trim();
  return value === "admin" || value === "reviewer" || value === "investigator" ? value : null;
}

function primaryEmail(user: ClerkCurrentUser | null): string | null {
  if (!user) return null;
  const primary = user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId) ??
    user.emailAddresses[0] ??
    null;
  return primary?.emailAddress ?? null;
}

function displayName(user: ClerkCurrentUser | null): string | null {
  const value = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  return value || user?.username || null;
}

function envListIncludes(key: string, value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (process.env[key] ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalized);
}

function optionalEnv(key: string): string | null {
  const value = process.env[key]?.trim();
  return value ? value : null;
}

function getTestUser(): FaroAuthenticatedUser | null {
  if (process.env.FARO_ENABLE_TEST_AUTH !== "1") return null;
  const clerkUserId = optionalEnv("FARO_TEST_CLERK_USER_ID");
  if (!clerkUserId) return null;
  const role = readRoleValue({ role: process.env.FARO_TEST_CLERK_USER_ROLE }) ?? "investigator";
  return {
    clerkUserId,
    email: optionalEnv("FARO_TEST_CLERK_USER_EMAIL") ?? "",
    displayName: optionalEnv("FARO_TEST_CLERK_USER_NAME"),
    role,
  };
}
