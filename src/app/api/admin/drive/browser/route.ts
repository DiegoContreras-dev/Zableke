import type { NextRequest } from "next/server";
import { requestAdmin } from "@/backend/modules/drive/drive-auth";
import { DriveService } from "@/backend/modules/drive/drive-service";

export async function GET(request: NextRequest) {
  if (!await requestAdmin(request)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const service = new DriveService();
    if (request.nextUrl.searchParams.get("sharedDrives") === "true") {
      return Response.json({ folders: await service.browseSharedDrives() });
    }
    const parentId = request.nextUrl.searchParams.get("parentId") || "root";
    return Response.json({ folders: await service.browseFolders(parentId) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No fue posible leer Google Drive" },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!await requestAdmin(request)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json() as { name?: string; parentId?: string };
    const folder = await new DriveService().createFolder(body.name ?? "", body.parentId ?? "root");
    return Response.json({ folder });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No fue posible crear la carpeta" },
      { status: 400 },
    );
  }
}
