import type { InvestigationCasePack } from "../caseRepository.ts";
import type {
  InvestigationAggregate,
  InvestigationAnalysis,
  InvestigationWorkspace,
} from "../data/investigationWorkspaces.ts";

export interface MinimaxInvestigationAnalysisInput {
  workspace: InvestigationWorkspace;
  aggregate: InvestigationAggregate;
  casePacks: InvestigationCasePack[];
}

export interface MinimaxInvestigationAnalysisOptions {
  apiKey: string;
  apiUrl?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  now?: Date;
}

const defaultApiUrl = "https://api.minimax.io/v1/chat/completions";
const defaultModel = "MiniMax-M2.7";

export async function requestMinimaxInvestigationAnalysis(
  input: MinimaxInvestigationAnalysisInput,
  options: MinimaxInvestigationAnalysisOptions,
): Promise<InvestigationAnalysis> {
  const response = await (options.fetchImpl ?? fetch)(options.apiUrl ?? defaultApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model ?? defaultModel,
      messages: [
        {
          role: "system",
          content: [
            "Sos un analista de Faro para periodistas e investigadores.",
            "No acuses, no inventes fuentes y no completes datos faltantes.",
            "Separá evidencia oficial, contexto periodístico, notas de usuario y brechas.",
            "Cada afirmación importante debe citar caseId, sourceId, receiptId o nota.",
          ].join(" "),
        },
        {
          role: "user",
          content: buildInvestigationPrompt(input),
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`MiniMax analysis failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json() as MinimaxResponse;
  const markdown = extractMiniMaxContent(payload);
  if (!markdown) {
    throw new Error("MiniMax analysis returned an empty response.");
  }

  const createdAt = (options.now ?? new Date()).toISOString();
  return {
    id: `ANALYSIS-${createdAt.replace(/[-:.TZ]/g, "").slice(0, 14)}`,
    createdAt,
    summary: summarizeMarkdown(markdown),
    markdown,
  };
}

export function buildInvestigationPrompt(input: MinimaxInvestigationAnalysisInput): string {
  return [
    "Generá un análisis de trabajo en español claro.",
    "No inventes fuentes, hechos, montos, culpabilidad ni relaciones no incluidas.",
    "Usá lenguaje neutral: Faro muestra dónde mirar y qué falta verificar.",
    "Devolvé Markdown con estas secciones: Resumen, Evidencia oficial, Cruces, Brechas, Próximos pasos.",
    "",
    "Paquete estructurado:",
    JSON.stringify({
      workspace: {
        id: input.workspace.id,
        title: input.workspace.title,
        countryCode: input.workspace.countryCode,
        description: input.workspace.description,
        investigationQuestion: input.workspace.investigationQuestion,
        caseRelations: input.workspace.caseRelations,
        sourceLinks: input.workspace.sourceLinks,
        notes: input.workspace.notes,
        entities: input.workspace.entities,
      },
      aggregate: input.aggregate,
      cases: input.casePacks.map(toCompactCasePack),
    }, null, 2),
  ].join("\n");
}

interface MinimaxResponse {
  choices?: Array<{
    message?: { content?: string };
    text?: string;
  }>;
  reply?: string;
  content?: string;
}

function extractMiniMaxContent(payload: MinimaxResponse): string {
  return [
    payload.choices?.[0]?.message?.content,
    payload.choices?.[0]?.text,
    payload.reply,
    payload.content,
  ].find((value) => typeof value === "string" && value.trim().length > 0)?.trim() ?? "";
}

function summarizeMarkdown(markdown: string): string {
  const firstContentLine = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#"));
  return firstContentLine ?? markdown.slice(0, 180);
}

function toCompactCasePack(pack: InvestigationCasePack) {
  const caseFile = pack.evidencePack.caseFile;
  return {
    caseId: pack.caseId,
    title: caseFile.title,
    countryCode: caseFile.countryCode,
    caseType: readStringField(caseFile, "caseType") || null,
    supplierName: readStringField(caseFile, "supplierName") || null,
    supplierDocument: readStringField(caseFile, "supplierDocument") || null,
    agencyName: caseFile.agencyName ?? null,
    contractingUnit: caseFile.contractingUnit ?? null,
    amount: readAmount(caseFile),
    year: caseFile.year ?? null,
    hasOfficialGeometry: Boolean(caseFile.coordinates),
    primaryReceipt: {
      receiptId: pack.evidencePack.receipt.receiptId,
      sourceId: pack.evidencePack.receipt.sourceId,
      sourceName: pack.evidencePack.receipt.sourceName,
      recordId: pack.evidencePack.receipt.recordId,
      locatorType: pack.evidencePack.receipt.locatorType,
    },
    relatedReceipts: pack.evidencePack.relatedReceipts.map((receipt) => ({
      receiptId: receipt.receiptId,
      sourceId: receipt.sourceId,
      recordId: receipt.recordId,
    })),
    signals: pack.evidencePack.signals.map((signal) => ({
      code: signal.code,
      label: signal.label,
      summary: signal.summary,
      evidence: signal.evidence,
      caveat: signal.caveat,
    })),
    caveats: pack.evidencePack.caveats,
  };
}

function readStringField(caseFile: InvestigationCasePack["evidencePack"]["caseFile"], key: string): string {
  if (!(key in caseFile)) return "";
  const value = (caseFile as unknown as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function readAmount(caseFile: InvestigationCasePack["evidencePack"]["caseFile"]): unknown {
  if (!("amount" in caseFile)) return null;
  return (caseFile as { amount?: unknown }).amount ?? null;
}
