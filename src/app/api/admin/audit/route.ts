import { requireFaroAdmin } from "../../../../lib/server/faroAuth.ts";
import { listContributionAuditEvents } from "../../../../lib/server/contributionAuditDb.ts";
import { isProductDatabaseConfigured } from "../../../../lib/server/productDb.ts";

export async function GET(request: Request) {
  const auth = await requireFaroAdmin();
  if (!auth.ok) {
    return Response.json(
      { error: auth.error, message: auth.message },
      { status: auth.status },
    );
  }
  if (!isProductDatabaseConfigured()) {
    return Response.json({
      auditType: "faro_admin_audit_v1",
      generatedAt: new Date().toISOString(),
      storageMode: "local",
      events: [],
    });
  }

  const url = new URL(request.url);
  const events = await listContributionAuditEvents({
    submissionId: url.searchParams.get("submissionId") ?? undefined,
    targetType: url.searchParams.get("targetType") ?? undefined,
    targetId: url.searchParams.get("targetId") ?? undefined,
  });
  return Response.json({
    auditType: "faro_admin_audit_v1",
    generatedAt: new Date().toISOString(),
    storageMode: "neon",
    events,
  });
}
