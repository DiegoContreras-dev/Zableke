import type { NextRequest } from "next/server";
import { requestAdmin } from "@/backend/modules/drive/drive-auth";
import { DriveService } from "@/backend/modules/drive/drive-service";

export async function GET(request: NextRequest) {
  if (!await requestAdmin(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const tutorUserId = request.nextUrl.searchParams.get("tutorUserId");
  const semester = request.nextUrl.searchParams.get("semester") || undefined;
  if (!tutorUserId) return Response.json({ error: "tutorUserId is required" }, { status: 400 });
  const folder = await new DriveService().folderForTutorUser(tutorUserId, semester);
  return Response.json({ folder });
}

export async function POST(request: NextRequest) {
  if (!await requestAdmin(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json() as { tutorUserId?: string; semester?: string };
    if (!body.tutorUserId) {
      return Response.json({ error: "tutorUserId is required" }, { status: 400 });
    }
    const folder = await new DriveService().provisionTutorFolder(body.tutorUserId, body.semester);
    return Response.json({ folder });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Drive provisioning failed" },
      { status: 502 },
    );
  }
}
