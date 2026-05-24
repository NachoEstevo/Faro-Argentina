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
  privacyMode: "anonymous",
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

test("validateContributionDraft accepts a neutral PDF aporte with private attachment metadata", () => {
  const result = validateContributionDraft({
    ...baseDraft,
    attachments: [
      { filename: "informe.pdf", mimeType: "application/pdf", sizeBytes: 240_000 },
    ],
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validateContributionDraft requires location and file for photo aportes", () => {
  const result = validateContributionDraft({
    ...baseDraft,
    publicSourceUrl: "",
    relatedCase: "",
    approximateLocation: "",
    attachments: [],
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors.map((error) => error.field), ["approximateLocation", "attachments"]);
  assert.match(result.errors[1].message, /archivo o foto/i);
});

test("validateContributionDraft requires a URL for source aportes", () => {
  const result = validateContributionDraft({
    ...baseDraft,
    type: "add_source",
    publicSourceUrl: "",
    relatedCase: "",
    approximateLocation: "",
    attachments: [],
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors.map((error) => error.field), ["publicSourceUrl"]);
});

test("validateContributionDraft accepts source aportes with a public URL and no attachment", () => {
  const result = validateContributionDraft({
    ...baseDraft,
    type: "add_source",
    publicSourceUrl: "https://example.com/fuente-oficial",
    relatedCase: "",
    approximateLocation: "",
    attachments: [],
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validateContributionDraft requires case, source, field and value for corrections", () => {
  const result = validateContributionDraft({
    ...baseDraft,
    type: "correct_data",
    publicSourceUrl: "",
    relatedCase: "",
    missingVerification: "",
    amountOrDate: "",
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors.map((error) => error.field), [
    "relatedCase",
    "publicSourceUrl",
    "missingVerification",
    "amountOrDate",
  ]);
});

test("validateContributionDraft accepts correction aportes with case, source, field and value", () => {
  const result = validateContributionDraft({
    ...baseDraft,
    type: "correct_data",
    publicSourceUrl: "https://example.com/resolucion",
    relatedCase: "AR-CONTRACT-46-0453-CON22",
    missingVerification: "Monto adjudicado",
    amountOrDate: "ARS 334,8 M",
    approximateLocation: "",
    attachments: [],
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
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

test("validateContributionDraft rejects contact fields in no-contact mode", () => {
  const result = validateContributionDraft({
    ...baseDraft,
    contactEmail: "periodista@example.com",
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors.map((error) => error.field), ["privacyMode"]);
});

test("validateContributionDraft accepts contact mode with a valid email", () => {
  const result = validateContributionDraft({
    ...baseDraft,
    privacyMode: "contact",
    contactEmail: "periodista@example.com",
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validateContributionDraft requires email in contact mode", () => {
  const result = validateContributionDraft({
    ...baseDraft,
    privacyMode: "contact",
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors.map((error) => error.field), ["contactEmail"]);
});

test("buildUserContribution creates a private submitted contribution without public attachment URLs", () => {
  const contribution = buildUserContribution(baseDraft, {
    id: "APORTE-TEST-001",
    createdAt: "2026-05-17T12:00:00.000Z",
    attachmentKeys: ["submissions/APORTE-TEST-001/ATT-001.webp"],
  });

  assert.equal(contribution.id, "APORTE-TEST-001");
  assert.equal(contribution.status, "submitted");
  assert.equal(contribution.privacyMode, "anonymous");
  assert.equal(contribution.contactEmail, null);
  assert.equal(contribution.attachments[0].originalFilename, "archivo-001.webp");
  assert.equal(contribution.attachments[0].objectKey, "submissions/APORTE-TEST-001/ATT-001.webp");
  assert.equal("publicUrl" in contribution.attachments[0], false);
});

test("buildUserContribution preserves contact fields only in contact mode", () => {
  const contribution = buildUserContribution(
    {
      ...baseDraft,
      privacyMode: "contact",
      contactName: "Fuente reservada",
      contactEmail: "periodista@example.com",
    },
    {
      id: "APORTE-TEST-002",
      createdAt: "2026-05-17T12:00:00.000Z",
      attachmentKeys: ["submissions/APORTE-TEST-002/ATT-001.webp"],
    },
  );

  assert.equal(contribution.privacyMode, "contact");
  assert.equal(contribution.contactName, "Fuente reservada");
  assert.equal(contribution.contactEmail, "periodista@example.com");
  assert.equal(contribution.attachments[0].originalFilename, "cartel.webp");
});
