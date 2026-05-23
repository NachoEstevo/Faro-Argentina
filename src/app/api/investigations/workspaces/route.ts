import { normalizeInvestigationWorkspaceCollection } from "../../../../lib/data/investigationWorkspaceCollections.ts";
import { requireFaroUser } from "../../../../lib/server/faroAuth.ts";
import {
  readUserInvestigationWorkspaceCollection,
  replaceUserInvestigationWorkspaceCollection,
} from "../../../../lib/server/investigationWorkspaceDb.ts";

export async function GET(request: Request) {
  void request;
  const auth = await requireFaroUser();
  if (!auth.ok) {
    return Response.json(
      { error: auth.error, message: auth.message },
      { status: auth.status },
    );
  }

  try {
    const collection = await readUserInvestigationWorkspaceCollection(auth.user);
    return Response.json({
      collectionType: "faro_private_workspace_collection_v1",
      storageMode: "neon",
      collection,
    });
  } catch (error) {
    console.error("[api/investigations/workspaces] read failed", error);
    return Response.json(
      {
        error: "workspace_sync_unavailable",
        message: "No pudimos cargar tus carpetas privadas en este momento.",
      },
      { status: 503 },
    );
  }
}

export async function PUT(request: Request) {
  const auth = await requireFaroUser();
  if (!auth.ok) {
    return Response.json(
      { error: auth.error, message: auth.message },
      { status: auth.status },
    );
  }

  try {
    const body = await request.json();
    const collection = normalizeInvestigationWorkspaceCollection(
      typeof body === "object" && body !== null && "collection" in body
        ? (body as { collection?: unknown }).collection
        : body,
    );
    const savedCollection = await replaceUserInvestigationWorkspaceCollection(auth.user, collection);
    return Response.json({
      collectionType: "faro_private_workspace_collection_v1",
      storageMode: "neon",
      collection: savedCollection,
    });
  } catch (error) {
    console.error("[api/investigations/workspaces] write failed", error);
    return Response.json(
      {
        error: "workspace_sync_unavailable",
        message: "No pudimos guardar tus carpetas privadas en este momento.",
      },
      { status: 503 },
    );
  }
}
