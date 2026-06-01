import test from "node:test";
import assert from "node:assert/strict";

import type { ContributionReviewStatus } from "../src/lib/data/userContributions.ts";
import {
  appendContributionReviewEvent,
  appendContributionReviewLink,
  hydrateContributionsWithReviewState,
} from "../src/lib/server/contributionReviewDb.ts";
import type { FaroAuthenticatedUser } from "../src/lib/server/faroAuth.ts";
import type { ProductSql } from "../src/lib/server/productDb.ts";
import type { ReviewedUserContribution } from "../src/lib/server/contributionReviewStorage.ts";

test("hydrateContributionsWithReviewState overlays Neon review trail and links", async () => {
  const sql = new FakeReviewSql();
  const reviewer = reviewerUser();
  const contribution = contributionFixture("APORTE-20260521-DB0001");

  await appendContributionReviewEvent({
    submissionId: contribution.id,
    status: "accepted_for_review",
    note: "Revisar contra expediente oficial.",
    reviewer,
    now: new Date("2026-05-21T10:00:00.000Z"),
  }, sql.asProductSql());
  await appendContributionReviewEvent({
    submissionId: contribution.id,
    status: "approved_for_investigation",
    note: "Listo para vincular como material privado.",
    reviewer,
    now: new Date("2026-05-21T11:00:00.000Z"),
  }, sql.asProductSql());
  await appendContributionReviewLink({
    submissionId: contribution.id,
    targetType: "case",
    targetId: "AR-CONTRACT-46-0453-CON22",
    targetLabel: "Obra vial revisada",
    note: "Comparar avance visible con cronologia.",
    reviewer,
    now: new Date("2026-05-21T12:00:00.000Z"),
  }, sql.asProductSql());

  const [hydrated] = await hydrateContributionsWithReviewState([contribution], sql.asProductSql());

  assert.equal(hydrated.status, "approved_for_investigation");
  assert.deepEqual(hydrated.reviewTrail?.map((entry) => entry.id), ["REV-001", "REV-002"]);
  assert.equal(hydrated.reviewTrail?.at(-1)?.reviewerName, "Reviewer Faro");
  assert.equal(hydrated.reviewLinks?.[0]?.id, "LINK-001");
  assert.equal(hydrated.reviewLinks?.[0]?.targetId, "AR-CONTRACT-46-0453-CON22");
  assert.equal(hydrated.reviewLinks?.[0]?.linkedBy, "Reviewer Faro");
});

test("appendContributionReviewLink scopes link ids by submission", async () => {
  const sql = new FakeReviewSql();
  const reviewer = reviewerUser();

  const first = await appendContributionReviewLink({
    submissionId: "APORTE-20260521-DB0001",
    targetType: "workspace",
    targetId: "carpeta-vialidad",
    targetLabel: "Carpeta Vialidad",
    reviewer,
    now: new Date("2026-05-21T12:00:00.000Z"),
  }, sql.asProductSql());
  const second = await appendContributionReviewLink({
    submissionId: "APORTE-20260521-DB0001",
    targetType: "workspace",
    targetId: "carpeta-vialidad",
    targetLabel: "Carpeta Vialidad",
    reviewer,
    now: new Date("2026-05-21T12:05:00.000Z"),
  }, sql.asProductSql());
  const otherSubmission = await appendContributionReviewLink({
    submissionId: "APORTE-20260521-DB0002",
    targetType: "workspace",
    targetId: "carpeta-vialidad",
    targetLabel: "Carpeta Vialidad",
    reviewer,
    now: new Date("2026-05-21T12:10:00.000Z"),
  }, sql.asProductSql());

  assert.equal(first.id, "LINK-001");
  assert.equal(second.id, "LINK-002");
  assert.equal(otherSubmission.id, "LINK-001");
});

test("appendContributionReviewEvent records authenticated reviewer before client fallback", async () => {
  const sql = new FakeReviewSql();
  const reviewer = reviewerUser();

  const event = await appendContributionReviewEvent({
    submissionId: "APORTE-20260521-DB0003",
    status: "accepted_for_review",
    reviewerName: "Nombre desde cliente",
    reviewer,
    now: new Date("2026-05-21T13:00:00.000Z"),
  }, sql.asProductSql());
  const link = await appendContributionReviewLink({
    submissionId: "APORTE-20260521-DB0003",
    targetType: "workspace",
    targetId: "carpeta-vialidad",
    targetLabel: "Carpeta Vialidad",
    reviewerName: "Nombre desde cliente",
    reviewer,
    now: new Date("2026-05-21T13:05:00.000Z"),
  }, sql.asProductSql());

  assert.equal(event.reviewerName, "Reviewer Faro");
  assert.equal(link.linkedBy, "Reviewer Faro");
});

test("hydrateContributionsWithReviewState preserves manifest review state until Neon has events", async () => {
  const sql = new FakeReviewSql();
  const contribution = {
    ...contributionFixture("APORTE-20260521-DB0003"),
    status: "approved",
    reviewTrail: [{
      id: "REV-999",
      status: "approved",
      note: "Estado viejo en manifiesto.",
      reviewerName: "Legacy",
      createdAt: "2026-05-20T10:00:00.000Z",
    }],
    reviewLinks: [{
      id: "LINK-999",
      targetType: "case",
      targetId: "AR-CONTRACT-46-0453-CON22",
      targetLabel: "Legacy",
      note: "Vinculo viejo en manifiesto.",
      linkedBy: "Legacy",
      createdAt: "2026-05-20T11:00:00.000Z",
    }],
  } satisfies ReviewedUserContribution;

  const [hydrated] = await hydrateContributionsWithReviewState([contribution], sql.asProductSql());

  assert.equal(hydrated.status, "approved_for_investigation");
  assert.equal(hydrated.reviewTrail?.[0]?.id, "REV-999");
  assert.equal(hydrated.reviewLinks?.[0]?.id, "LINK-999");
});

class FakeReviewSql {
  private readonly events: Array<{
    id: number;
    submission_id: string;
    status: ContributionReviewStatus;
    note: string;
    reviewer_name: string;
    created_at: string;
  }> = [];

  private readonly links: Array<{
    id: string;
    submission_id: string;
    target_type: "case" | "workspace";
    target_id: string;
    target_label: string;
    note: string;
    linked_by_name: string;
    created_at: string;
  }> = [];

  asProductSql(): ProductSql {
    return this as unknown as ProductSql;
  }

  async query(text: string, params: unknown[] = []): Promise<unknown[]> {
    if (text.includes("insert into faro_users")) return [];
    if (text.includes("insert into contribution_review_events")) {
      const [submissionId, status, note, , reviewerName, createdAt] = params;
      const row = {
        id: this.events.length + 1,
        submission_id: String(submissionId),
        status: status as ContributionReviewStatus,
        note: String(note ?? ""),
        reviewer_name: String(reviewerName ?? "Equipo Faro"),
        created_at: String(createdAt),
      };
      this.events.push(row);
      return [row];
    }
    if (text.includes("from contribution_review_events")) {
      const ids = params[0] as string[];
      return this.events.filter((event) => ids.includes(event.submission_id));
    }
    if (text.includes("select count(*)::int as link_count")) {
      const submissionId = String(params[0]);
      return [{ link_count: this.links.filter((link) => link.submission_id === submissionId).length }];
    }
    if (text.includes("insert into contribution_review_links")) {
      const [id, submissionId, targetType, targetId, targetLabel, note, , linkedByName, createdAt] = params;
      const row = {
        id: String(id),
        submission_id: String(submissionId),
        target_type: targetType as "case" | "workspace",
        target_id: String(targetId),
        target_label: String(targetLabel ?? ""),
        note: String(note ?? ""),
        linked_by_name: String(linkedByName ?? "Equipo Faro"),
        created_at: String(createdAt),
      };
      this.links.push(row);
      return [row];
    }
    if (text.includes("from contribution_review_links")) {
      const ids = params[0] as string[];
      return this.links.filter((link) => ids.includes(link.submission_id));
    }
    throw new Error(`Unexpected SQL in fake contribution review db: ${text}`);
  }
}

function reviewerUser(): FaroAuthenticatedUser {
  return {
    clerkUserId: "user_reviewer",
    email: "reviewer@example.com",
    displayName: "Reviewer Faro",
    role: "reviewer",
  };
}

function contributionFixture(id: string): ReviewedUserContribution {
  return {
    id,
    type: "add_photo",
    title: "Foto de avance visible",
    jurisdiction: "AR",
    explanation: "Material propio para revisar contra fuentes oficiales.",
    publicSourceUrl: null,
    relatedCase: "AR-CONTRACT-46-0453-CON22",
    officialIdentifier: null,
    organization: null,
    namedEntity: null,
    amountOrDate: null,
    approximateLocation: "Santa Fe",
    capturedAt: null,
    missingVerification: null,
    privacyMode: "contact",
    contactName: "Periodista",
    contactEmail: "periodista@example.com",
    sourcePermissionConfirmed: true,
    reviewConfirmed: true,
    status: "submitted",
    publicationStatus: "private",
    createdAt: "2026-05-21T09:00:00.000Z",
    attachments: [],
  };
}
