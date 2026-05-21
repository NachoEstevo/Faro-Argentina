import test from "node:test";
import assert from "node:assert/strict";

import { POST } from "../src/app/api/investigations/analyze/route.ts";

const vialidadCaseId = "AR-HIST-JUD-VIALIDAD-CFP-5048-SENTENCIA-FIRME";

test("POST /api/investigations/analyze rejects wrong access code", async () => {
  const env = saveEnv();
  process.env.INVESTIGATIONS_ACCESS_CODE = "test-access-code";
  process.env.MINIMAX_API_KEY = "minimax-test-key";

  try {
    const response = await POST(request({ accessCode: "WRONG", caseIds: [vialidadCaseId] }));
    const payload = await response.json() as { error: string };

    assert.equal(response.status, 403);
    assert.equal(payload.error, "invalid_access_code");
  } finally {
    restoreEnv(env);
  }
});

test("POST /api/investigations/analyze reports missing MiniMax key after code passes", async () => {
  const env = saveEnv();
  process.env.INVESTIGATIONS_ACCESS_CODE = "test-access-code";
  delete process.env.MINIMAX_API_KEY;

  try {
    const response = await POST(request({ accessCode: "test-access-code", caseIds: [vialidadCaseId] }));
    const payload = await response.json() as { error: string };

    assert.equal(response.status, 503);
    assert.equal(payload.error, "analysis_unavailable");
  } finally {
    restoreEnv(env);
  }
});

test("POST /api/investigations/analyze rejects oversized case sets", async () => {
  const env = saveEnv();
  process.env.INVESTIGATIONS_ACCESS_CODE = "test-access-code";
  process.env.MINIMAX_API_KEY = "minimax-test-key";

  try {
    const response = await POST(request({
      accessCode: "test-access-code",
      caseIds: Array.from({ length: 41 }, (_, index) => `CASE-${index}`),
    }));
    const payload = await response.json() as { error: string; limit: number };

    assert.equal(response.status, 400);
    assert.equal(payload.error, "too_many_case_ids");
    assert.equal(payload.limit, 40);
  } finally {
    restoreEnv(env);
  }
});

test("POST /api/investigations/analyze calls MiniMax server-side and returns structured analysis", async () => {
  const env = saveEnv();
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; authorization: string | null; body: string }> = [];
  process.env.INVESTIGATIONS_ACCESS_CODE = "test-access-code";
  process.env.MINIMAX_API_KEY = "minimax-test-key";

  globalThis.fetch = async (input: URL | RequestInfo, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    calls.push({
      url: String(input),
      authorization: headers.get("authorization"),
      body: String(init?.body ?? ""),
    });
    return Response.json({
      choices: [
        {
          message: {
            content: [
              "<think>Voy a analizar el paquete estructurado antes de responder.</think>",
              "```markdown",
              "# Análisis de trabajo",
              "La carpeta contiene evidencia oficial y huecos de verificacion.",
              "```",
            ].join("\n\n"),
          },
        },
      ],
    });
  };

  try {
    const response = await POST(request({
      accessCode: "test-access-code",
      caseIds: [vialidadCaseId],
      workspace: {
        title: "Causa Vialidad",
        countryCode: "AR",
        description: "Carpeta privada de prueba.",
        caseRelations: [{
          caseId: vialidadCaseId,
          reason: "same_judicial_context",
          note: "Contexto judicial oficial compartido.",
          addedAt: "2026-05-17T12:05:00.000Z",
        }],
        sourceLinks: [{ id: "SRC-1", url: "https://example.test", label: "Fuente", note: "nota" }],
        notes: [{ id: "NOTE-1", body: "Cruzar obras mencionadas.", createdAt: "2026-05-17T12:00:00.000Z" }],
        entities: [{ id: "ENT-1", label: "Vialidad", kind: "agency", note: "" }],
      },
    }));
    const payload = await response.json() as {
      analysis: { markdown: string; summary: string };
      aggregate: { caseCount: number };
    };

    assert.equal(response.status, 200);
    assert.equal(payload.aggregate.caseCount, 1);
    assert.match(payload.analysis.markdown, /Análisis de trabajo/);
    assert.match(payload.analysis.summary, /evidencia oficial/);
    assert.doesNotMatch(payload.analysis.markdown, /<think>|<\/think>|Voy a analizar/);
    assert.doesNotMatch(payload.analysis.markdown, /```/);
    assert.doesNotMatch(payload.analysis.summary, /<think>|<\/think>|Voy a analizar/);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, "https://api.minimax.io/v1/chat/completions");
    assert.equal(calls[0]?.authorization, "Bearer minimax-test-key");
    assert.doesNotMatch(calls[0]?.body ?? "", /minimax-test-key/);
    assert.match(calls[0]?.body ?? "", /No inventes fuentes/);
    assert.match(calls[0]?.body ?? "", /matriz de trabajo/i);
    assert.match(calls[0]?.body ?? "", /próximo paso concreto/i);
    assert.match(calls[0]?.body ?? "", /caseRelations/);
    assert.match(calls[0]?.body ?? "", /same_judicial_context/);
    assert.match(calls[0]?.body ?? "", /Contexto judicial oficial compartido/);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv(env);
  }
});

test("POST /api/investigations/analyze hides provider failures from public responses", async () => {
  const env = saveEnv();
  const originalFetch = globalThis.fetch;
  const previousConsoleError = console.error;
  process.env.INVESTIGATIONS_ACCESS_CODE = "test-access-code";
  process.env.MINIMAX_API_KEY = "minimax-test-key";
  console.error = () => undefined;

  globalThis.fetch = async () => new Response(
    "provider trace with minimax-test-key and upstream internals",
    { status: 500 },
  );

  try {
    const response = await POST(request({
      accessCode: "test-access-code",
      caseIds: [vialidadCaseId],
    }));
    const payload = await response.json() as { error: string; message: string };

    assert.equal(response.status, 502);
    assert.equal(payload.error, "analysis_failed");
    assert.equal(payload.message, "No pudimos generar el análisis en este momento. Probá nuevamente en unos minutos.");
    assert.doesNotMatch(payload.message, /minimax-test-key|provider|upstream|trace/i);
  } finally {
    console.error = previousConsoleError;
    globalThis.fetch = originalFetch;
    restoreEnv(env);
  }
});

function request(body: unknown): Request {
  return new Request("http://localhost/api/investigations/analyze", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function saveEnv() {
  return {
    INVESTIGATIONS_ACCESS_CODE: process.env.INVESTIGATIONS_ACCESS_CODE,
    MINIMAX_API_KEY: process.env.MINIMAX_API_KEY,
    MINIMAX_API_URL: process.env.MINIMAX_API_URL,
    MINIMAX_MODEL: process.env.MINIMAX_MODEL,
  };
}

function restoreEnv(values: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
