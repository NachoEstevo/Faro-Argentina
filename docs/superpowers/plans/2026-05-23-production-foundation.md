# Faro Argentina production foundation

## Scope

Move the private investigation workflow from browser-only plus access-code sync
to a production account model:

- Clerk owns user authentication.
- Neon stores private investigation folders per authenticated user.
- Cloudflare R2 remains the attachment/object store for aportes and future files.
- Vercel receives the same env contract used locally.
- AI provider wiring stays out of this slice.

## Product decisions

- The map and public explorer remain accessible without login.
- Carpetas can still be used locally when signed out, but account sync requires
  Clerk.
- A user only reads and writes their own folders.
- Faro does not infer wrongdoing from a folder. Folders are private workspaces
  for collecting evidence and hypotheses.
- R2 is not used as the source of truth for structured folders; Postgres is.

## Implementation order

1. Add Clerk app wrapper, middleware proxy, and sign-in/sign-up routes.
2. Add Neon schema and migration runner.
3. Add server helpers for auth, roles, and DB access.
4. Replace `/api/investigations/workspaces` with Clerk + Neon persistence.
5. Update the Carpetas UX from code-based sync to account sync.
6. Update tests and env docs.
7. Run migration, tests, typecheck, build, and browser smoke.

## Later slices

- Move admin aportes review from access-code auth to Clerk reviewer/admin roles.
- Add contribution attachment ownership metadata in Postgres while files stay in
  R2.
- Add workspace sharing/collaboration after the single-user model is stable.
- Add AI analysis provider after account and evidence persistence are reliable.
