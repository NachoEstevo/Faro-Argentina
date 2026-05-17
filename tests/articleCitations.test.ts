import test from "node:test";
import assert from "node:assert/strict";

import historicalJudicialDataset from "../src/data/argentinaHistoricalJudicialCases.json" with { type: "json" };
import crossCountryDataset from "../src/data/crossCountryCaseFiles.json" with { type: "json" };
import articleCitationPayload from "../src/data/articleCitations.json" with { type: "json" };
import {
  ARTICLE_CONTEXT_CAVEAT,
  buildArticleCitationIndex,
  buildArticleCitations,
  getArticleCitationsForCase,
  type ArticleCitation,
  type ArticleCitationInput,
} from "../src/lib/data/articleCitations.ts";
import { verifyArticleCitations } from "../src/lib/data/articleCitationVerifier.ts";

const vialidadCase = historicalJudicialDataset.cases.find(
  (caseFile) => caseFile.id === "AR-HIST-JUD-VIALIDAD-CFP-5048-SENTENCIA-FIRME",
);

assert.ok(vialidadCase);

const verifiableArticleCases = [
  ...historicalJudicialDataset.cases,
  ...crossCountryDataset.cases,
];

const vialidadFamilyCaseIds = [
  "AR-HIST-JUD-VIALIDAD-CFP-5048-SENTENCIA-FIRME",
  "AR-HIST-JUD-VIALIDAD-DNV-9067-2007-RP9",
  "AR-HIST-JUD-VIALIDAD-DNV-12309-2007-RN288",
  "AR-HIST-JUD-VIALIDAD-DNV-12328-2007-RP12",
  "AR-HIST-JUD-VIALIDAD-DNV-16751-2006-CANTERAS-RN3",
  "AR-HIST-JUD-VIALIDAD-DNV-1615-2008-CANTERAS-RN3",
] as const;

const highValueCuadernosSupplierCaseIds = [
  "AR-HIST-JUD-CUADERNOS-CAMARITA-CONSTRUMEX",
  "AR-HIST-JUD-CUADERNOS-CAMARITA-MARCALBA",
  "AR-HIST-JUD-CUADERNOS-CAMARITA-COARCO",
  "AR-HIST-JUD-CUADERNOS-CAMARITA-CONCRET-NOR",
] as const;

const articleInput: ArticleCitationInput = {
  citationId: "test-vialidad-context",
  citationType: "news_article",
  status: "active",
  linkScope: "direct_case",
  title: "Titular del medio sobre la causa Vialidad",
  publisher: "Chequeado",
  publisherShortName: "Chequeado",
  authors: ["Equipo de Chequeado"],
  url: "https://chequeado.com/el-explicador/la-corte-fallo-contra-cristina-fernandez-de-kirchner-en-la-causa-vialidad-ira-presa-y-no-podra-ser-candidata/comment-page-1/",
  archiveUrl: null,
  publishedAt: "2025-06-10",
  retrievedAt: "2026-05-17",
  language: "es",
  linkedCaseIds: [vialidadCase.id],
  matchedOfficialReceiptIds: [
    "AR-CIJ-VIALIDAD-VEREDICTO-VIALIDAD-CFP-5048-SENTENCIA-FIRME:CIJ-VIALIDAD-FIRMEZA-2025-07-01",
  ],
  matchBasis: [
    {
      field: "procedureNumber",
      value: "CFP 5048/2016/TO1",
      matchType: "exact",
    },
  ],
  claimSummaries: [
    {
      summary: "El medio reporta que la Corte Suprema dejo firme la sentencia en la Causa Vialidad.",
      support: "official_receipt_confirms_field",
      officialReceiptIds: [
        "AR-CIJ-VIALIDAD-VEREDICTO-VIALIDAD-CFP-5048-SENTENCIA-FIRME:CIJ-VIALIDAD-FIRMEZA-2025-07-01",
      ],
      caveat: ARTICLE_CONTEXT_CAVEAT,
    },
  ],
  caveats: [ARTICLE_CONTEXT_CAVEAT],
  parserVersion: "article-citations-test@1",
};

test("buildArticleCitations adds stable hashes and keeps active citations case-indexable", () => {
  const payload = buildArticleCitations([articleInput], {
    generatedAt: "2026-05-17T00:00:00.000Z",
  });
  const [citation] = payload.citations;

  assert.equal(payload.citationType, "faro_contextual_article_citations");
  assert.equal(citation?.metadataHash.startsWith("sha256-"), true);
  assert.equal(citation?.contextRole, "journalism_context");
  assert.equal(citation?.ui.caveat, ARTICLE_CONTEXT_CAVEAT);
  assert.equal(citation?.ui.iconName, "badge-check");

  const index = buildArticleCitationIndex(payload.citations);
  assert.equal(index.get(vialidadCase.id)?.[0]?.citationId, "test-vialidad-context");
  assert.equal(getArticleCitationsForCase(vialidadCase.id, payload.citations).length, 1);
});

test("getArticleCitationsForCase hides non-active citations by default", () => {
  const payload = buildArticleCitations([
    articleInput,
    { ...articleInput, citationId: "test-vialidad-draft", status: "needs_review" },
  ], {
    generatedAt: "2026-05-17T00:00:00.000Z",
  });

  assert.deepEqual(
    getArticleCitationsForCase(vialidadCase.id, payload.citations).map((citation) => citation.citationId),
    ["test-vialidad-context"],
  );
});

test("verifyArticleCitations rejects unknown linked cases and unmatched official receipt ids", () => {
  const payload = buildArticleCitations([
    {
      ...articleInput,
      linkedCaseIds: ["missing-case"],
      matchedOfficialReceiptIds: ["missing-receipt"],
      claimSummaries: [
        {
          ...articleInput.claimSummaries[0],
          officialReceiptIds: ["missing-receipt"],
        },
      ],
    },
  ], {
    generatedAt: "2026-05-17T00:00:00.000Z",
  });

  const report = verifyArticleCitations({
    citations: payload.citations,
    cases: historicalJudicialDataset.cases,
  });

  assert.match(report.errors.join("\n"), /unknown linked case/);
  assert.match(report.errors.join("\n"), /official receipt missing from linked cases/);
});

test("verifyArticleCitations keeps article-only claims separate from official receipt support", () => {
  const payload = buildArticleCitations([
    {
      ...articleInput,
      claimSummaries: [
        {
          ...articleInput.claimSummaries[0],
          support: "article_only",
          officialReceiptIds: [
            "AR-CIJ-VIALIDAD-VEREDICTO-VIALIDAD-CFP-5048-SENTENCIA-FIRME:CIJ-VIALIDAD-FIRMEZA-2025-07-01",
          ],
        },
      ],
    },
  ], {
    generatedAt: "2026-05-17T00:00:00.000Z",
  });

  const report = verifyArticleCitations({
    citations: payload.citations,
    cases: historicalJudicialDataset.cases,
  });

  assert.match(report.errors.join("\n"), /article_only claim should not cite official receipts/);
});

test("checked-in article citation pilot validates against current official cases", () => {
  const report = verifyArticleCitations({
    citations: articleCitationPayload.citations as ArticleCitation[],
    cases: verifiableArticleCases,
  });

  assert.deepEqual(report.errors, []);
  assert.equal(report.checkedCitations >= 2, true);
  assert.equal(
    getArticleCitationsForCase(
      "AR-HIST-JUD-VIALIDAD-CFP-5048-SENTENCIA-FIRME",
      articleCitationPayload.citations as ArticleCitation[],
    ).length >= 2,
    true,
  );
  assert.equal(
    getArticleCitationsForCase(
      "AR-HIST-JUD-CUADERNOS-CAMARITA-TOF7-2026",
      articleCitationPayload.citations as ArticleCitation[],
    ).length >= 2,
    true,
  );
  assert.equal(report.checkedCitations >= 16, true);
  assert.equal(
    new Set(
      (articleCitationPayload.citations as ArticleCitation[])
        .filter((citation) => citation.status === "active")
        .flatMap((citation) => citation.linkedCaseIds),
    ).size >= 26,
    true,
  );
  assert.equal(
    (articleCitationPayload.citations as ArticleCitation[]).every((citation) =>
      [
        "direct_case",
        "case_family",
        "supplier_entity",
        "project_context",
        "territorial_context",
        "event_context",
      ].includes(citation.linkScope)
    ),
    true,
  );
  for (const caseId of vialidadFamilyCaseIds) {
    assert.equal(
      getArticleCitationsForCase(caseId, articleCitationPayload.citations as ArticleCitation[])
        .length >= 2,
      true,
    );
  }
  for (const caseId of highValueCuadernosSupplierCaseIds) {
    assert.equal(
      getArticleCitationsForCase(caseId, articleCitationPayload.citations as ArticleCitation[])
        .length >= 1,
      true,
    );
  }
  assert.ok(
    (articleCitationPayload.citations as ArticleCitation[]).some((citation) =>
      citation.citationId === "lanacion-cuadernos-camarita-empresas-2018-09-18" &&
      citation.linkedCaseIds.includes("AR-HIST-JUD-CUADERNOS-CAMARITA-COARCO") &&
      citation.linkedCaseIds.includes("AR-HIST-JUD-CUADERNOS-CAMARITA-MARCALBA")
    ),
  );
  assert.ok(
    (articleCitationPayload.citations as ArticleCitation[]).some((citation) =>
      citation.citationId === "losandes-cuadernos-ruta82-proveedores-2020-02-06" &&
      citation.linkedCaseIds.includes("AR-HIST-JUD-CUADERNOS-CAMARITA-CONSTRUMEX") &&
      citation.linkedCaseIds.includes("AR-HIST-JUD-CUADERNOS-CAMARITA-CONCRET-NOR")
    ),
  );
  assert.equal(
    (articleCitationPayload.citations as ArticleCitation[])
      .filter((citation) => citation.linkedCaseIds.length > 1)
      .every((citation) =>
        citation.caveats.some((caveat) =>
          /causa madre|familia de casos|proveedor|proyecto compartido|no es mencion individual/i.test(caveat)
        )
      ),
    true,
  );
  assert.equal(
    (articleCitationPayload.citations as ArticleCitation[]).every((citation) =>
      ["badge-check", "globe", "newspaper", "radio-tower"].includes(citation.ui.iconName)
    ),
    true,
  );
});
