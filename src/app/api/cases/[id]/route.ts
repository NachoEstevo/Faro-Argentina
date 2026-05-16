import { NextResponse } from "next/server";

import { getExpedienteById } from "@/lib/caseRepository";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const expediente = getExpedienteById(decodeURIComponent(id));
  if (!expediente) {
    return NextResponse.json({ error: "case_not_found" }, { status: 404 });
  }
  return NextResponse.json(expediente);
}
