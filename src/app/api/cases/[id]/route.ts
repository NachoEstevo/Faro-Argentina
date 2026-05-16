import { NextResponse } from "next/server";

import { getCaseById } from "@/lib/caseRepository";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const caseFile = getCaseById(id);
  if (!caseFile) {
    return NextResponse.json({ error: "case_not_found" }, { status: 404 });
  }
  return NextResponse.json(caseFile);
}
