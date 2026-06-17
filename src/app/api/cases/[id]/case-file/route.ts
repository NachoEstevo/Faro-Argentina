import { NextResponse } from "next/server";

import { getInitialMapCaseById } from "@/lib/data/initialMapCases";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const caseFile = getInitialMapCaseById(decodeURIComponent(id));
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
