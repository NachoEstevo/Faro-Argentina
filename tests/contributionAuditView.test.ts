import test from "node:test";
import assert from "node:assert/strict";

import {
  auditActionLabel,
  toContributionAuditViewEvent,
} from "../src/lib/server/contributionAuditView.ts";
import type { ContributionAuditEvent } from "../src/lib/server/contributionAuditDb.ts";

test("contribution audit view renders readable labels and redacted metadata", () => {
  const event = toContributionAuditViewEvent({
    id: "1",
    submissionId: "APORTE-20260604-AUDIT01",
    action: "attachment_opened",
    actorName: "Admin Faro",
    actorRole: "admin",
    targetType: "attachment",
    targetId: "ATT-001",
    metadata: {
      objectKey: "submissions/APORTE-20260604-AUDIT01/ATT-001.webp",
      contactEmail: "source@example.com",
      filename: "private-name.webp",
      mimeType: "image/webp",
      sizeBytes: 1200,
    },
    createdAt: "2026-06-04T10:00:00.000Z",
  } satisfies ContributionAuditEvent);

  assert.equal(event.actionLabel, "Adjunto privado abierto");
  assert.equal(event.targetLabel, "attachment · ATT-001");
  assert.deepEqual(event.metadataSummary, ["archivo: image/webp", "tamaño: 1.200"]);
  assert.doesNotMatch(JSON.stringify(event), /objectKey|submissions\/|source@example|private-name/);
});

test("contribution audit view labels inbox opening without exposing private contents", () => {
  const event = toContributionAuditViewEvent({
    id: "2",
    submissionId: null,
    action: "admin_inbox_opened",
    actorName: "Admin Faro",
    actorRole: "admin",
    targetType: "admin_inbox",
    targetId: "aportes",
    metadata: {
      storageMode: "neon",
      submissionCount: 12,
      userAgent: "Browser with extensions",
    },
    createdAt: "2026-06-04T10:00:00.000Z",
  } satisfies ContributionAuditEvent);

  assert.equal(auditActionLabel("admin_inbox_opened"), "Bandeja abierta");
  assert.deepEqual(event.metadataSummary, ["storage: neon", "aportes: 12"]);
  assert.doesNotMatch(JSON.stringify(event), /Browser with extensions/);
});
