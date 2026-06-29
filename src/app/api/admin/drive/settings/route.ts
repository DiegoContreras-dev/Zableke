import type { NextRequest } from "next/server";
import { requestAdmin } from "@/backend/modules/drive/drive-auth";
import { DriveService } from "@/backend/modules/drive/drive-service";

export async function GET(request: NextRequest) {
  if (!await requestAdmin(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const semester = request.nextUrl.searchParams.get("semester") || undefined;
  return Response.json(await new DriveService().getPublicSettings(semester));
}

export async function PUT(request: NextRequest) {
  if (!await requestAdmin(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json() as {
      rootFolderId?: string;
      semester?: string;
      months?: number[];
    };
    const result = await new DriveService().saveSettings({
      rootFolderId: body.rootFolderId ?? "",
      semester: body.semester ?? "",
      months: Array.isArray(body.months) ? body.months : [],
    });
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid Drive settings" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!await requestAdmin(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  await new DriveService().disconnectAccount();
  return Response.json({ disconnected: true });
}
