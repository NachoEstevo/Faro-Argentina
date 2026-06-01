import type { FaroAuthenticatedUser } from "./faroAuth.ts";
import { getProductSql, type ProductSql } from "./productDb.ts";

export async function upsertFaroUser(
  user: FaroAuthenticatedUser,
  activeWorkspaceId?: string | null,
  sql: ProductSql = getProductSql(),
): Promise<void> {
  const shouldUpdateActiveWorkspace = arguments.length >= 2 && activeWorkspaceId !== undefined;
  await sql.query(
    `insert into faro_users (clerk_user_id, email, role, display_name, active_workspace_id, updated_at)
     values ($1, $2, $3, $4, $5, now())
     on conflict (clerk_user_id) do update set
       email = excluded.email,
       role = excluded.role,
       display_name = excluded.display_name,
       active_workspace_id = case
         when $6::boolean then excluded.active_workspace_id
         else faro_users.active_workspace_id
       end,
       updated_at = now()`,
    [
      user.clerkUserId,
      user.email,
      user.role,
      user.displayName,
      activeWorkspaceId ?? null,
      shouldUpdateActiveWorkspace,
    ],
  );
}
