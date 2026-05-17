import {
  ARTICLE_CONTEXT_CAVEAT,
  computeArticleMetadataHash,
  type ArticleCitation,
} from "./articleCitations.ts";

interface VerifiableCase {
  id: string;
  receipt?: { receiptId: string };
  relatedReceipts?: Array<{ receiptId: string }>;
}

export interface ArticleCitationVerificationReport {
  checkedCitations: number;
  checkedLinkedCases: number;
  errors: string[];
}

export function verifyArticleCitations({
  citations,
  cases,
}: {
  citations: ArticleCitation[];
  cases: VerifiableCase[];
}): ArticleCitationVerificationReport {
  const errors: string[] = [];
  const casesById = new Map(cases.map((caseFile) => [caseFile.id, caseFile]));
  const receiptIdsByCaseId = new Map(
    cases.map((caseFile) => [caseFile.id, collectReceiptIds(caseFile)]),
  );
  const citationIds = new Set<string>();
  let checkedLinkedCases = 0;

  for (const citation of citations) {
    if (citationIds.has(citation.citationId)) {
      errors.push(`${citation.citationId}: duplicate citationId`);
    }
    citationIds.add(citation.citationId);

    if (citation.citationType !== "news_article") {
      errors.push(`${citation.citationId}: unsupported citationType`);
    }
    if (citation.contextRole !== "journalism_context") {
      errors.push(`${citation.citationId}: contextRole must stay journalism_context`);
    }
    if (!isSupportedLinkScope(citation.linkScope)) {
      errors.push(`${citation.citationId}: unsupported linkScope`);
    }
    if (!isHttpUrl(citation.url)) {
      errors.push(`${citation.citationId}: invalid url`);
    }
    if (citation.archiveUrl && !isHttpUrl(citation.archiveUrl)) {
      errors.push(`${citation.citationId}: invalid archiveUrl`);
    }
    if (!isIsoDate(citation.publishedAt)) {
      errors.push(`${citation.citationId}: invalid publishedAt`);
    }
    if (!isIsoDate(citation.retrievedAt)) {
      errors.push(`${citation.citationId}: invalid retrievedAt`);
    }
    if (citation.caveats.length === 0) {
      errors.push(`${citation.citationId}: missing caveats`);
    }
    if (!citation.caveats.includes(ARTICLE_CONTEXT_CAVEAT)) {
      errors.push(`${citation.citationId}: missing article context caveat`);
    }
    if (citation.parserVersion.trim().length === 0) {
      errors.push(`${citation.citationId}: missing parserVersion`);
    }
    if (citation.metadataHash !== computeArticleMetadataHash(citation)) {
      errors.push(`${citation.citationId}: metadata hash mismatch`);
    }
    if (citation.status === "active" && citation.linkedCaseIds.length === 0) {
      errors.push(`${citation.citationId}: active citation needs linked cases`);
    }
    if (citation.status === "active" && citation.matchBasis.length === 0) {
      errors.push(`${citation.citationId}: active citation needs match basis`);
    }
    if (citation.status === "active" && citation.claimSummaries.length === 0) {
      errors.push(`${citation.citationId}: active citation needs claim summaries`);
    }
    if (
      citation.status === "active" &&
      citation.linkedCaseIds.length > 1 &&
      citation.linkScope === "direct_case"
    ) {
      errors.push(`${citation.citationId}: direct_case citations should not fan out to multiple cases`);
    }
    if (
      citation.status === "active" &&
      citation.linkScope !== "direct_case" &&
      !citation.caveats.some((caveat) => /contexto|no prueba|no reemplaza/i.test(caveat))
    ) {
      errors.push(`${citation.citationId}: non-direct citation needs an explicit context caveat`);
    }

    const linkedReceiptIds = new Set<string>();
    for (const caseId of citation.linkedCaseIds) {
      checkedLinkedCases += 1;
      const caseFile = casesById.get(caseId);
      if (!caseFile) {
        errors.push(`${citation.citationId}: unknown linked case ${caseId}`);
        continue;
      }
      for (const receiptId of receiptIdsByCaseId.get(caseId) ?? []) {
        linkedReceiptIds.add(receiptId);
      }
    }

    for (const receiptId of citation.matchedOfficialReceiptIds) {
      if (!linkedReceiptIds.has(receiptId)) {
        errors.push(`${citation.citationId}: official receipt missing from linked cases ${receiptId}`);
      }
    }

    for (const claim of citation.claimSummaries) {
      if (!claim.caveat.trim()) {
        errors.push(`${citation.citationId}: claim summary missing caveat`);
      }
      if (claim.support === "article_only" && claim.officialReceiptIds.length > 0) {
        errors.push(`${citation.citationId}: article_only claim should not cite official receipts as claim support`);
      }
      if (claim.support !== "article_only" && claim.officialReceiptIds.length === 0) {
        errors.push(`${citation.citationId}: claim with official support needs official receipt ids`);
      }
      for (const receiptId of claim.officialReceiptIds) {
        if (!linkedReceiptIds.has(receiptId)) {
          errors.push(`${citation.citationId}: claim receipt missing from linked cases ${receiptId}`);
        }
      }
    }
  }

  return {
    checkedCitations: citations.length,
    checkedLinkedCases,
    errors,
  };
}

function collectReceiptIds(caseFile: VerifiableCase): Set<string> {
  return new Set([
    caseFile.receipt?.receiptId,
    ...(caseFile.relatedReceipts ?? []).map((receipt) => receipt.receiptId),
  ].filter((receiptId): receiptId is string => Boolean(receiptId)));
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
  return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isSupportedLinkScope(value: string): boolean {
  return [
    "direct_case",
    "case_family",
    "supplier_entity",
    "project_context",
    "territorial_context",
    "event_context",
  ].includes(value);
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ||
    /^\d{4}-\d{2}-\d{2}T/.test(value);
}
