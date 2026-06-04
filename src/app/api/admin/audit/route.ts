import { requireFaroAdmin } from "../../../../lib/server/faroAuth.ts";
import { listContributionAuditViewEvents } from "../../../../lib/server/contributionAuditView.ts";
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
      message: "La auditoría persistente requiere DATABASE_URL productiva; este entorno no conserva eventos.",
      events: [],
    });
  }

  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get("limit") ?? "100");
  const events = await listContributionAuditViewEvents({
    submissionId: url.searchParams.get("submissionId") ?? undefined,
    targetType: url.searchParams.get("targetType") ?? undefined,
    targetId: url.searchParams.get("targetId") ?? undefined,
    limit: Number.isFinite(limitParam) ? limitParam : 100,
  });
  return Response.json({
    auditType: "faro_admin_audit_v1",
    generatedAt: new Date().toISOString(),
    storageMode: "neon",
    events,
  });
}
