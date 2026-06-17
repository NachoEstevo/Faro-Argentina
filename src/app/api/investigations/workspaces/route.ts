import {
  InvalidInvestigationWorkspaceCollectionError,
  parsePersistableInvestigationWorkspaceCollection,
} from "../../../../lib/data/investigationWorkspaceCollections.ts";
import { requireFaroUser } from "../../../../lib/server/faroAuth.ts";
import {
  readUserInvestigationWorkspaceCollection,
  replaceUserInvestigationWorkspaceCollection,
} from "../../../../lib/server/investigationWorkspaceDb.ts";
import { assertSameOriginRequest } from "../../../../lib/server/requestGuards.ts";

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
        message: "No pudimos cargar tus espacios privados en este momento.",
      },
      { status: 503 },
    );
  }
}

export async function PUT(request: Request) {
  const origin = assertSameOriginRequest(request);
  if (!origin.ok) {
    return Response.json(
      { error: origin.error, message: origin.message },
      { status: origin.status },
    );
  }
  const auth = await requireFaroUser();
  if (!auth.ok) {
    return Response.json(
      { error: auth.error, message: auth.message },
      { status: auth.status },
    );
  }

  try {
    const body = await request.json();
    const collection = parsePersistableInvestigationWorkspaceCollection(
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
    if (error instanceof InvalidInvestigationWorkspaceCollectionError) {
      return Response.json(
        {
          error: "invalid_workspace_collection",
          message: "No pudimos guardar el espacio privado porque el payload esta incompleto.",
        },
        { status: 400 },
      );
    }
    console.error("[api/investigations/workspaces] write failed", error);
    return Response.json(
      {
        error: "workspace_sync_unavailable",
        message: "No pudimos guardar tus espacios privados en este momento.",
      },
      { status: 503 },
    );
  }
}
