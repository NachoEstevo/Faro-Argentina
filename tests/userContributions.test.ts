import test from "node:test";
import assert from "node:assert/strict";

import {
  buildUserContribution,
  validateContributionDraft,
} from "../src/lib/data/userContributions.ts";

const baseDraft = {
  type: "add_photo",
  title: "Cartel de obra visible en ruta provincial",
  jurisdiction: "AR",
  explanation: "La foto muestra el cartel de obra y puede ayudar a revisar el expediente relacionado.",
  publicSourceUrl: "",
  relatedCase: "AR-CONTRATAR-CONTRATOS-381-1001-CON21",
  approximateLocation: "Santa Cruz",
  sourcePermissionConfirmed: true,
  reviewConfirmed: true,
  attachments: [
    { filename: "cartel.webp", mimeType: "image/webp", sizeBytes: 340_000 },
  ],
} as const;

test("validateContributionDraft accepts a neutral photo aporte with private attachment metadata", () => {
  const result = validateContributionDraft(baseDraft);

  assert.deepEqual(result.errors, []);
  assert.equal(result.valid, true);
});

test("validateContributionDraft requires a review anchor", () => {
  const result = validateContributionDraft({
    ...baseDraft,
    publicSourceUrl: "",
    relatedCase: "",
    approximateLocation: "",
    attachments: [],
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors.map((error) => error.field), ["reviewAnchor"]);
});

test("validateContributionDraft rejects unsupported or oversized attachments", () => {
  const result = validateContributionDraft({
    ...baseDraft,
    attachments: [
      { filename: "script.svg", mimeType: "image/svg+xml", sizeBytes: 12_000 },
      { filename: "obra.jpg", mimeType: "image/jpeg", sizeBytes: 10_500_001 },
    ],
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors.map((error) => error.field), ["attachments.0", "attachments.1"]);
});

test("validateContributionDraft blocks accusatory contribution copy", () => {
  const result = validateContributionDraft({
    ...baseDraft,
    title: "Fraude en obra pública",
    explanation: "Esto demuestra corrupción de funcionarios.",
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors.map((error) => error.field), ["title", "explanation"]);
});

test("buildUserContribution creates a private submitted contribution without public attachment URLs", () => {
  const contribution = buildUserContribution(baseDraft, {
    id: "APORTE-TEST-001",
    createdAt: "2026-05-17T12:00:00.000Z",
    attachmentKeys: ["submissions/APORTE-TEST-001/ATT-001.webp"],
  });

  assert.equal(contribution.id, "APORTE-TEST-001");
  assert.equal(contribution.status, "submitted");
  assert.equal(contribution.attachments[0].objectKey, "submissions/APORTE-TEST-001/ATT-001.webp");
  assert.equal("publicUrl" in contribution.attachments[0], false);
});
