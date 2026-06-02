import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAdminInboxTabs,
  getAvailableReviewActions,
  sortContributionsForReview,
  statusLabel,
  statusWorkflow,
  type Contribution,
} from "../src/components/Admin/AdminAportesTypes.ts";

test("statusWorkflow exposes the approved operational review order", () => {
  assert.deepEqual(
    statusWorkflow.map((item) => [item.value, item.label, item.actionLabel]),
    [
      ["submitted", "Recibido", "Marcar recibido"],
      ["accepted_for_review", "En revisión", "Tomar en revisión"],
      ["needs_more_info", "Necesita más info", "Pedir más info"],
      ["approved_for_investigation", "Aprobado para investigar", "Aprobar para investigar"],
      ["rejected", "Descartado", "Descartar aporte"],
    ],
  );
  assert.equal(statusLabel("submitted"), "Recibido");
  assert.equal(statusLabel("approved"), "Aprobado para investigar");
});

test("sortContributionsForReview prioritizes active review work before completed items", () => {
  const sorted = sortContributionsForReview([
    contribution("APORTE-20260521-REJECTED", "rejected", "2026-05-21T10:00:00.000Z"),
    contribution("APORTE-20260521-APPROVED", "approved_for_investigation", "2026-05-21T11:00:00.000Z"),
    contribution("APORTE-20260521-INFO", "needs_more_info", "2026-05-20T10:00:00.000Z"),
    contribution("APORTE-20260521-NEW", "submitted", "2026-05-19T10:00:00.000Z"),
    contribution("APORTE-20260521-REVIEW", "accepted_for_review", "2026-05-22T10:00:00.000Z"),
  ]);

  assert.deepEqual(sorted.map((item) => item.id), [
    "APORTE-20260521-NEW",
    "APORTE-20260521-REVIEW",
    "APORTE-20260521-INFO",
    "APORTE-20260521-APPROVED",
    "APORTE-20260521-REJECTED",
  ]);
});

test("buildAdminInboxTabs separates active work from closed housekeeping states", () => {
  const tabs = buildAdminInboxTabs([
    contribution("APORTE-20260521-NEW", "submitted", "2026-05-19T10:00:00.000Z"),
    contribution("APORTE-20260521-REVIEW", "accepted_for_review", "2026-05-20T10:00:00.000Z"),
    contribution("APORTE-20260521-REJECTED", "rejected", "2026-05-21T10:00:00.000Z"),
    contribution("APORTE-20260521-PUBLISHED", "approved_for_investigation", "2026-05-22T10:00:00.000Z", {
      publicationStatus: "published_curated",
    }),
    contribution("APORTE-20260521-ARCHIVED", "approved_for_investigation", "2026-05-23T10:00:00.000Z", {
      inboxState: "archived",
    }),
    contribution("APORTE-20260521-REMOVED", "rejected", "2026-05-24T10:00:00.000Z", {
      inboxState: "removed",
    }),
  ]);

  assert.deepEqual(
    tabs.map((tab) => [tab.value, tab.label, tab.count]),
    [
      ["active", "Activos", 2],
      ["accepted_for_review", "En revisión", 1],
      ["needs_more_info", "Necesita info", 0],
      ["approved_for_investigation", "Aprobados", 0],
      ["rejected", "Descartados", 1],
      ["published_curated", "Publicados", 1],
      ["archived", "Archivados", 1],
      ["removed", "Removidos", 1],
    ],
  );
});

test("getAvailableReviewActions disables the current review decision", () => {
  const rejected = contribution("APORTE-20260521-REJECTED", "rejected", "2026-05-21T10:00:00.000Z");
  const actions = getAvailableReviewActions(rejected);

  assert.equal(actions.find((action) => action.value === "rejected")?.disabled, true);
  assert.equal(actions.find((action) => action.value === "accepted_for_review")?.disabled, false);
  assert.equal(actions.find((action) => action.value === "rejected")?.reason, "Estado actual");
});

function contribution(
  id: string,
  status: Contribution["status"],
  createdAt: string,
  overrides: Partial<Contribution> = {},
): Contribution {
  return {
    id,
    type: "add_photo",
    title: id,
    jurisdiction: "AR",
    explanation: "Material privado para revisar.",
    publicSourceUrl: null,
    relatedCase: null,
    officialIdentifier: null,
    organization: null,
    namedEntity: null,
    amountOrDate: null,
    approximateLocation: null,
    capturedAt: null,
    missingVerification: null,
    contactName: null,
    contactEmail: null,
    status,
    publicationStatus: "private",
    inboxState: "active",
    createdAt,
    attachments: [],
    ...overrides,
  };
}
