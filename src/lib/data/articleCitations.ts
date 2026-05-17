import { createHash } from "node:crypto";

export const ARTICLE_CONTEXT_CAVEAT =
  "Referencia externa; no reemplaza la fuente oficial ni prueba pagos, avance físico o responsabilidad." as const;

export type ArticleCitationStatus = "active" | "needs_review" | "superseded" | "retracted";
export type ArticleCitationSupport =
  | "article_only"
  | "official_identifier_match"
  | "official_receipt_confirms_field";
export type ArticleCitationLinkScope =
  | "direct_case"
  | "case_family"
  | "supplier_entity"
  | "project_context"
  | "territorial_context"
  | "event_context";
export type ArticleCitationMatchField =
  | "caseId"
  | "procedureNumber"
  | "workNumber"
  | "supplierDocument"
  | "supplierName"
  | "agencyName"
  | "courtCaseNumber";
export type ArticleCitationMatchType = "exact" | "normalized" | "manual_reviewed";
export type ArticleCitationIconName = "badge-check" | "globe" | "newspaper" | "radio-tower";

export interface ArticleCitationMatchBasis {
  field: ArticleCitationMatchField;
  value: string;
  matchType: ArticleCitationMatchType;
}

export interface ArticleCitationClaimSummary {
  summary: string;
  support: ArticleCitationSupport;
  officialReceiptIds: string[];
  caveat: string;
}

export interface ArticleCitationInput {
  citationId: string;
  citationType: "news_article";
  status: ArticleCitationStatus;
  linkScope: ArticleCitationLinkScope;
  title: string;
  publisher: string;
  publisherShortName?: string;
  authors: string[];
  url: string;
  archiveUrl?: string | null;
  publishedAt: string;
  retrievedAt: string;
  language: string;
  linkedCaseIds: string[];
  matchedOfficialReceiptIds: string[];
  matchBasis: ArticleCitationMatchBasis[];
  claimSummaries: ArticleCitationClaimSummary[];
  caveats: string[];
  parserVersion: string;
}

export interface ArticleCitation extends ArticleCitationInput {
  contextRole: "journalism_context";
  metadataHash: string;
  ui: {
    publisherBadge: string;
    iconName: ArticleCitationIconName;
    scopeLabel: string;
    actionLabel: "Abrir artículo";
    caveat: typeof ARTICLE_CONTEXT_CAVEAT;
  };
}

export interface ArticleCitationPayload {
  citationType: "faro_contextual_article_citations";
  generatedAt: string;
  citations: ArticleCitation[];
}

export function buildArticleCitations(
  citations: ArticleCitationInput[],
  { generatedAt }: { generatedAt: string },
): ArticleCitationPayload {
  return {
    citationType: "faro_contextual_article_citations",
    generatedAt,
    citations: citations.map(toArticleCitation),
  };
}

export function buildArticleCitationIndex(
  citations: ArticleCitation[],
): Map<string, ArticleCitation[]> {
  const index = new Map<string, ArticleCitation[]>();
  for (const citation of citations) {
    if (citation.status !== "active") continue;
    for (const caseId of citation.linkedCaseIds) {
      const current = index.get(caseId) ?? [];
      current.push(citation);
      index.set(caseId, current);
    }
  }
  for (const [caseId, caseCitations] of index) {
    index.set(caseId, sortArticleCitations(caseCitations));
  }
  return index;
}

export function getArticleCitationsForCase(
  caseId: string,
  citations: ArticleCitation[],
): ArticleCitation[] {
  return sortArticleCitations(
    citations.filter((citation) =>
      citation.status === "active" && citation.linkedCaseIds.includes(caseId)
    ),
  );
}

export function computeArticleMetadataHash(
  citation: ArticleCitation | ArticleCitationInput,
): string {
  const { metadataHash: _metadataHash, ...hashable } = citation as ArticleCitation;
  return `sha256-${hashStableJson(hashable)}`;
}

function toArticleCitation(input: ArticleCitationInput): ArticleCitation {
  const caveats = uniqueStrings([...input.caveats, ARTICLE_CONTEXT_CAVEAT]);
  const citationWithoutHash = {
    ...input,
    caveats,
    contextRole: "journalism_context" as const,
    ui: {
      publisherBadge: buildPublisherBadge(input.publisherShortName ?? input.publisher),
      iconName: selectCitationIcon(input.publisherShortName ?? input.publisher),
      scopeLabel: labelLinkScope(input.linkScope),
      actionLabel: "Abrir artículo" as const,
      caveat: ARTICLE_CONTEXT_CAVEAT,
    },
  };
  return {
    ...citationWithoutHash,
    metadataHash: computeArticleMetadataHash(citationWithoutHash),
  };
}

function sortArticleCitations(citations: ArticleCitation[]): ArticleCitation[] {
  return [...citations].sort((left, right) =>
    right.publishedAt.localeCompare(left.publishedAt) ||
    left.publisher.localeCompare(right.publisher) ||
    left.citationId.localeCompare(right.citationId),
  );
}

function buildPublisherBadge(name: string): string {
  const words = name
    .replace(/[^a-zA-Z0-9ÁÉÍÓÚÜÑáéíóúüñ ]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "N";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function selectCitationIcon(name: string): ArticleCitationIconName {
  const normalized = name.toLowerCase();
  if (normalized.includes("chequeado")) return "badge-check";
  if (normalized.includes("reuters") || normalized === "ap" || normalized.includes("ap news")) {
    return "radio-tower";
  }
  if (
    normalized.includes("dw") ||
    normalized.includes("deutsche welle") ||
    normalized.includes("bbc") ||
    normalized.includes("al jazeera")
  ) {
    return "globe";
  }
  return "newspaper";
}

function labelLinkScope(scope: ArticleCitationLinkScope): string {
  if (scope === "direct_case") return "Caso directo";
  if (scope === "case_family") return "Familia judicial";
  if (scope === "supplier_entity") return "Proveedor";
  if (scope === "project_context") return "Proyecto";
  if (scope === "territorial_context") return "Territorio";
  return "Evento";
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function hashStableJson(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(stableValue(value))).digest("hex");
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = stableValue((value as Record<string, unknown>)[key]);
      return result;
    }, {});
}
