import { getInvestigationCasePacks } from "../../../../lib/caseRepository.ts";
import {
  buildInvestigationAggregate,
  createInvestigationWorkspace,
  INVESTIGATION_RELATION_REASON_OPTIONS,
  type InvestigationCaseRelation,
  type InvestigationCaseRelationReason,
  type InvestigationEntity,
  type InvestigationNote,
  type InvestigationSourceLink,
} from "../../../../lib/data/investigationWorkspaces.ts";
import { requestMinimaxInvestigationAnalysis } from "../../../../lib/server/minimaxInvestigationAnalysis.ts";

const maxCaseIds = 40;

export async function POST(request: Request) {
  const body = await request.json() as AnalysisRequestBody;
  const expectedAccessCode = optionalEnv("INVESTIGATIONS_ACCESS_CODE");
  const accessCode = String(body.accessCode ?? "");

  if (!expectedAccessCode) {
    return Response.json({ error: "analysis_access_not_configured" }, { status: 503 });
  }
  if (accessCode !== expectedAccessCode) {
    return Response.json({ error: "invalid_access_code" }, { status: 403 });
  }

  const caseIds = parseCaseIds(body.caseIds);
  if (caseIds.length === 0) {
    return Response.json({ error: "missing_case_ids" }, { status: 400 });
  }
  if (caseIds.length > maxCaseIds) {
    return Response.json({ error: "too_many_case_ids", limit: maxCaseIds }, { status: 400 });
  }

  const apiKey = optionalEnv("MINIMAX_API_KEY");
  if (!apiKey) {
    return Response.json({ error: "analysis_unavailable" }, { status: 503 });
  }

  const result = getInvestigationCasePacks(caseIds);
  if (result.missingCaseIds.length > 0) {
    return Response.json(
      { error: "case_not_found", missingCaseIds: result.missingCaseIds },
      { status: 404 },
    );
  }

  const workspace = buildWorkspace(body.workspace, caseIds);
  const aggregate = buildInvestigationAggregate(
    workspace,
    result.casePacks.map((pack) => pack.evidencePack),
  );

  try {
    const analysis = await requestMinimaxInvestigationAnalysis(
      { workspace, aggregate, casePacks: result.casePacks },
      {
        apiKey,
        apiUrl: optionalEnv("MINIMAX_API_URL") ?? undefined,
        model: optionalEnv("MINIMAX_MODEL") ?? undefined,
      },
    );
    return Response.json({
      analysisType: "faro_investigation_analysis_response",
      generatedAt: analysis.createdAt,
      analysis,
      aggregate,
      caseIds,
    });
  } catch (error) {
    console.error("[api/investigations/analyze] analysis failed", error);
    return Response.json(
      {
        error: "analysis_failed",
        message: "No pudimos generar el análisis en este momento. Probá nuevamente en unos minutos.",
      },
      { status: 502 },
    );
  }
}

interface AnalysisRequestBody {
  accessCode?: string;
  caseIds?: unknown;
  workspace?: Partial<{
    title: string;
    countryCode: "AR";
    description: string;
    investigationQuestion: string | null;
    caseRelations: InvestigationCaseRelation[];
    sourceLinks: InvestigationSourceLink[];
    notes: InvestigationNote[];
    entities: InvestigationEntity[];
  }>;
}

function buildWorkspace(workspace: AnalysisRequestBody["workspace"], caseIds: string[]) {
  return {
    ...createInvestigationWorkspace({
      title: workspace?.title ?? "Carpeta de investigación",
      countryCode: workspace?.countryCode ?? null,
      description: workspace?.description ?? "",
      investigationQuestion: workspace?.investigationQuestion ?? null,
      tags: [],
    }),
    caseIds,
    caseRelations: sanitizeCaseRelations(workspace?.caseRelations, caseIds),
    sourceLinks: sanitizeSourceLinks(workspace?.sourceLinks),
    notes: sanitizeNotes(workspace?.notes),
    entities: sanitizeEntities(workspace?.entities),
  };
}

function parseCaseIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean),
  )];
}

function sanitizeSourceLinks(value: unknown): InvestigationSourceLink[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).map((item, index) => {
    const record = item as Partial<InvestigationSourceLink>;
    return {
      id: String(record.id ?? `SRC-${index + 1}`),
      url: String(record.url ?? "").slice(0, 500),
      label: String(record.label ?? "").slice(0, 120),
      note: String(record.note ?? "").slice(0, 1000),
    };
  }).filter((item) => item.url || item.note || item.label);
}

function sanitizeCaseRelations(value: unknown, caseIds: string[]): InvestigationCaseRelation[] {
  if (!Array.isArray(value)) return [];
  const selectedCaseIds = new Set(caseIds);
  const relations = new Map<string, InvestigationCaseRelation>();
  for (const item of value.slice(0, maxCaseIds)) {
    const record = item as Partial<InvestigationCaseRelation>;
    const relation = {
      caseId: String(record.caseId ?? "").trim().slice(0, 200),
      reason: sanitizeRelationReason(record.reason),
      note: String(record.note ?? "").slice(0, 1000),
      addedAt: String(record.addedAt ?? new Date().toISOString()),
    };
    if (relation.caseId && selectedCaseIds.has(relation.caseId)) relations.set(relation.caseId, relation);
  }
  return [...relations.values()];
}

function sanitizeNotes(value: unknown): InvestigationNote[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 30).map((item, index) => {
    const record = item as Partial<InvestigationNote>;
    return {
      id: String(record.id ?? `NOTE-${index + 1}`),
      body: String(record.body ?? "").slice(0, 4000),
      createdAt: String(record.createdAt ?? new Date().toISOString()),
    };
  }).filter((item) => item.body);
}

function sanitizeEntities(value: unknown): InvestigationEntity[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 50).map((item, index) => {
    const record = item as Partial<InvestigationEntity>;
    return {
      id: String(record.id ?? `ENT-${index + 1}`),
      label: String(record.label ?? "").slice(0, 160),
      kind: record.kind ?? "other",
      note: String(record.note ?? "").slice(0, 1000),
    };
  }).filter((item) => item.label);
}

function sanitizeRelationReason(value: unknown): InvestigationCaseRelationReason {
  const reason = String(value ?? "manual_hypothesis") as InvestigationCaseRelationReason;
  return INVESTIGATION_RELATION_REASON_OPTIONS.some((option) => option.value === reason)
    ? reason
    : "manual_hypothesis";
}

function optionalEnv(key: string): string | null {
  const value = process.env[key]?.trim();
  return value ? value : null;
}
