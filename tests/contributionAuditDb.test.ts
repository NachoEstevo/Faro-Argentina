import test from "node:test";
import assert from "node:assert/strict";

import {
  appendContributionAuditEvent,
  listContributionAuditEvents,
} from "../src/lib/server/contributionAuditDb.ts";
import type { FaroAuthenticatedUser } from "../src/lib/server/faroAuth.ts";
import type { ProductSql } from "../src/lib/server/productDb.ts";

test("appendContributionAuditEvent records actor, action, target and metadata", async () => {
  const sql = new FakeAuditSql();
  const event = await appendContributionAuditEvent({
    submissionId: "APORTE-20260521-AUDIT01",
    action: "attachment_opened",
    actor: reviewerUser(),
    targetType: "attachment",
    targetId: "ATT-001",
    metadata: { mimeType: "image/webp", sizeBytes: 12 },
    now: new Date("2026-05-21T12:00:00.000Z"),
  }, sql.asProductSql());

  assert.equal(event.id, "1");
  assert.equal(event.submissionId, "APORTE-20260521-AUDIT01");
  assert.equal(event.action, "attachment_opened");
  assert.equal(event.actorName, "Reviewer Faro");
  assert.equal(event.actorRole, "reviewer");
  assert.equal(event.targetType, "attachment");
  assert.equal(event.targetId, "ATT-001");
  assert.deepEqual(event.metadata, { mimeType: "image/webp", sizeBytes: 12 });
  assert.equal(event.createdAt, "2026-05-21T12:00:00.000Z");
});

test("listContributionAuditEvents filters by submission and returns newest first", async () => {
  const sql = new FakeAuditSql();
  await appendContributionAuditEvent({
    submissionId: "APORTE-20260521-AUDIT01",
    action: "review_status_changed",
    actor: reviewerUser(),
    now: new Date("2026-05-21T10:00:00.000Z"),
  }, sql.asProductSql());
  await appendContributionAuditEvent({
    submissionId: "APORTE-20260521-AUDIT01",
    action: "review_link_created",
    actor: reviewerUser(),
    now: new Date("2026-05-21T11:00:00.000Z"),
  }, sql.asProductSql());
  await appendContributionAuditEvent({
    submissionId: "APORTE-20260521-OTHER01",
    action: "attachment_opened",
    actor: reviewerUser(),
    now: new Date("2026-05-21T12:00:00.000Z"),
  }, sql.asProductSql());

  const events = await listContributionAuditEvents({
    submissionId: "APORTE-20260521-AUDIT01",
  }, sql.asProductSql());

  assert.deepEqual(events.map((event) => event.action), [
    "review_link_created",
    "review_status_changed",
  ]);
});

class FakeAuditSql {
  private readonly events: Array<{
    id: number;
    submission_id: string | null;
    action: string;
    actor_name: string | null;
    actor_role: string | null;
    target_type: string | null;
    target_id: string | null;
    metadata: unknown;
    created_at: string;
  }> = [];

  asProductSql(): ProductSql {
    return this as unknown as ProductSql;
  }

  async query(text: string, params: unknown[] = []): Promise<unknown[]> {
    if (text.includes("insert into faro_users")) return [];
    if (text.includes("insert into contribution_audit_events")) {
      const [submissionId, action, , actorName, actorRole, targetType, targetId, metadata, createdAt] = params;
      const row = {
        id: this.events.length + 1,
        submission_id: submissionId ? String(submissionId) : null,
        action: String(action),
        actor_name: String(actorName ?? "Equipo Faro"),
        actor_role: String(actorRole ?? "reviewer"),
        target_type: targetType ? String(targetType) : null,
        target_id: targetId ? String(targetId) : null,
        metadata: String(metadata ?? "{}"),
        created_at: String(createdAt),
      };
      this.events.push(row);
      return [row];
    }
    if (text.includes("from contribution_audit_events")) {
      const [submissionId, targetType, targetId, limit] = params;
      return this.events
        .filter((event) => !submissionId || event.submission_id === submissionId)
        .filter((event) => !targetType || event.target_type === targetType)
        .filter((event) => !targetId || event.target_id === targetId)
        .sort((left, right) => right.created_at.localeCompare(left.created_at) || right.id - left.id)
        .slice(0, Number(limit));
    }
    throw new Error(`Unexpected SQL in fake contribution audit db: ${text}`);
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
