import type { NextRequest } from "next/server";
import { requestAdmin } from "@/backend/modules/drive/drive-auth";
import { DriveService } from "@/backend/modules/drive/drive-service";

export async function POST(request: NextRequest) {
  if (!await requestAdmin(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  try {
    return Response.json(await new DriveService().testConnection());
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Google Drive test failed" },
      { status: 502 },
    );
  }
}
