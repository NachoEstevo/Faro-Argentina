import test from "node:test";
import assert from "node:assert/strict";

import {
  listCuratedEvidenceForSubmissions,
  listPublishedCuratedEvidenceForExpediente,
  resolveContributionPublicationStatus,
  upsertCuratedContributionEvidence,
  withdrawCuratedContributionEvidence,
} from "../src/lib/server/curatedContributionEvidenceDb.ts";
import type { FaroAuthenticatedUser } from "../src/lib/server/faroAuth.ts";
import type { ProductSql } from "../src/lib/server/productDb.ts";

test("upsertCuratedContributionEvidence creates and publishes curated records", async () => {
  const sql = new FakeCuratedSql();
  const candidate = await upsertCuratedContributionEvidence(baseInput("candidate"), sql.asProductSql());
  const published = await upsertCuratedContributionEvidence(baseInput("published_curated"), sql.asProductSql());

  assert.equal(candidate.status, "candidate");
  assert.equal(published.id, candidate.id);
  assert.equal(published.status, "published_curated");
  assert.equal(published.title, "Foto revisada de avance visible");
  assert.equal(published.promotedByName, "Admin Faro");
});

test("listPublishedCuratedEvidenceForExpediente excludes candidates and withdrawn records", async () => {
  const sql = new FakeCuratedSql();
  await upsertCuratedContributionEvidence(baseInput("candidate", "CURATED-1"), sql.asProductSql());
  await upsertCuratedContributionEvidence(baseInput("published_curated", "CURATED-2"), sql.asProductSql());
  await upsertCuratedContributionEvidence(baseInput("published_curated", "CURATED-3"), sql.asProductSql());
  await withdrawCuratedContributionEvidence({
    id: "CURATED-3",
    withdrawnBy: adminUser(),
    withdrawnAt: new Date("2026-05-22T12:00:00.000Z"),
  }, sql.asProductSql());

  const published = await listPublishedCuratedEvidenceForExpediente(
    "AR-CONTRACT-46-0453-CON22",
    sql.asProductSql(),
  );

  assert.deepEqual(published.map((item) => item.id), ["CURATED-2"]);
  assert.equal(resolveContributionPublicationStatus(await listCuratedEvidenceForSubmissions(
    ["APORTE-20260521-CURATED01"],
    sql.asProductSql(),
  )), "published_curated");
});

class FakeCuratedSql {
  private readonly rows = new Map<string, CuratedRow>();

  asProductSql(): ProductSql {
    return this as unknown as ProductSql;
  }

  async query(text: string, params: unknown[] = []): Promise<unknown[]> {
    if (text.includes("insert into faro_users")) return [];
    if (text.includes("insert into curated_contribution_evidence")) {
      const [
        id,
        submissionId,
        expedienteId,
        status,
        title,
        caption,
        caveat,
        sourceLabel,
        permissionNote,
        reviewedByName,
        ,
        promotedByName,
        promotedAt,
        internalNote,
      ] = params;
      const row: CuratedRow = {
        id: String(id),
        submission_id: String(submissionId),
        expediente_id: String(expedienteId),
        status: status as CuratedRow["status"],
        title: String(title),
        caption: String(caption),
        caveat: String(caveat),
        source_label: String(sourceLabel),
        permission_note: String(permissionNote),
        reviewed_by_name: String(reviewedByName),
        promoted_by_name: String(promotedByName),
        promoted_at: String(promotedAt),
        withdrawn_at: null,
        withdrawn_by_name: null,
        internal_note: String(internalNote ?? ""),
      };
      this.rows.set(row.id, row);
      return [row];
    }
    if (text.includes("update curated_contribution_evidence")) {
      const [id, withdrawnAt, , withdrawnByName] = params;
      const row = this.rows.get(String(id));
      if (!row) return [];
      const updated: CuratedRow = {
        ...row,
        status: "withdrawn",
        withdrawn_at: String(withdrawnAt),
        withdrawn_by_name: String(withdrawnByName),
      };
      this.rows.set(updated.id, updated);
      return [updated];
    }
    if (text.includes("where expediente_id = $1 and status = 'published_curated'")) {
      const [expedienteId] = params;
      return [...this.rows.values()]
        .filter((row) => row.expediente_id === expedienteId && row.status === "published_curated")
        .sort((left, right) => right.promoted_at.localeCompare(left.promoted_at));
    }
    if (text.includes("where submission_id = any")) {
      const ids = params[0] as string[];
      return [...this.rows.values()]
        .filter((row) => ids.includes(row.submission_id))
        .sort((left, right) => right.promoted_at.localeCompare(left.promoted_at));
    }
    throw new Error(`Unexpected SQL in fake curated evidence db: ${text}`);
  }
}

interface CuratedRow {
  id: string;
  submission_id: string;
  expediente_id: string;
  status: "candidate" | "published_curated" | "withdrawn";
  title: string;
  caption: string;
  caveat: string;
  source_label: string;
  permission_note: string;
  reviewed_by_name: string;
  promoted_by_name: string;
  promoted_at: string;
  withdrawn_at: string | null;
  withdrawn_by_name: string | null;
  internal_note: string;
}

function baseInput(status: "candidate" | "published_curated", id = "CURATED-1") {
  return {
    id,
    submissionId: "APORTE-20260521-CURATED01",
    expedienteId: "AR-CONTRACT-46-0453-CON22",
    status,
    title: "Foto revisada de avance visible",
    caption: "Material aportado para orientar revisión documental del expediente.",
    caveat: "No reemplaza la fuente oficial ni confirma avance físico por sí solo.",
    sourceLabel: "Aporte privado revisado por Faro",
    permissionNote: "La persona confirmó que era material propio o autorizado para revisión.",
    reviewedByName: "Equipo Faro",
    promotedBy: adminUser(),
    promotedAt: new Date(status === "candidate" ? "2026-05-21T10:00:00.000Z" : "2026-05-21T11:00:00.000Z"),
    internalNote: "Publicar sólo como evidencia complementaria.",
  };
}

function adminUser(): FaroAuthenticatedUser {
  return {
    clerkUserId: "user_admin",
    email: "admin@example.com",
    displayName: "Admin Faro",
    role: "admin",
  };
}
