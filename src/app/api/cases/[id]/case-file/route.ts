import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { getInitialMapCaseById } from "@/lib/data/initialMapCases";
import type { ExplorerCase } from "@/lib/data/explorerCases";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const clientInvestigatorCasesPath = path.join(
  process.cwd(),
  "public",
  "exports",
  "faro-client-investigator-cases.json",
);

let exportedCaseIndexPromise: Promise<Map<string, ExplorerCase>> | null = null;

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const caseId = decodeURIComponent(id);
  const caseFile = getInitialMapCaseById(caseId) ?? await findExportedCaseById(caseId);
  if (!caseFile) {
    return NextResponse.json({ error: "case_not_found" }, { status: 404 });
  }
  return NextResponse.json(
    { caseFile },
    {
      headers: {
        "cache-control": "public, max-age=300, stale-while-revalidate=3600",
      },
    },
  );
}

async function findExportedCaseById(caseId: string): Promise<ExplorerCase | null> {
  try {
    const index = await getExportedCaseIndex();
    return index.get(caseId) ?? null;
  } catch {
    return null;
  }
}

function getExportedCaseIndex(): Promise<Map<string, ExplorerCase>> {
  if (!exportedCaseIndexPromise) {
    exportedCaseIndexPromise = readFile(clientInvestigatorCasesPath, "utf8")
      .then((raw) => {
        const payload = JSON.parse(raw) as { cases?: unknown };
        const cases = Array.isArray(payload.cases) ? payload.cases as ExplorerCase[] : [];
        return new Map(cases.map((caseFile) => [caseFile.id, caseFile]));
      })
      .catch((error: unknown) => {
        exportedCaseIndexPromise = null;
        throw error;
      });
  }
  return exportedCaseIndexPromise;
}
