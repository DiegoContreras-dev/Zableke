import type { NextRequest } from "next/server";
import { requestUser } from "@/backend/modules/drive/drive-auth";
import { DriveService } from "@/backend/modules/drive/drive-service";

export async function GET(request: NextRequest) {
  const user = await requestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const semester = request.nextUrl.searchParams.get("semester") || undefined;
  const folder = await new DriveService().folderForTutorUser(user.id, semester);
  return Response.json({ folder });
}
