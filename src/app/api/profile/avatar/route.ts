import type { NextRequest } from "next/server";
import { getMinioClient, MINIO_BUCKET } from "@/lib/minio";
import { prisma } from "@/infrastructure/prisma/client";
import { createContext } from "@/graphql/context";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png"]);

async function requireCurrentUser(request: NextRequest) {
  const { currentUser } = await createContext(request);
  return currentUser;
}

export async function GET(request: NextRequest) {
  const user = await requireCurrentUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const requestedUserId = request.nextUrl.searchParams.get("userId");
  const targetUserId = requestedUserId || user.id;
  if (targetUserId !== user.id && !user.roles.includes("ADMIN")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const profile = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { avatarUrl: true },
  });
  if (!profile?.avatarUrl) {
    return Response.json({ error: "Avatar not found" }, { status: 404 });
  }

  try {
    const stream = await getMinioClient().getObject(
      MINIO_BUCKET,
      `avatars/${targetUserId}`,
    );
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const metadata = await getMinioClient().statObject(
      MINIO_BUCKET,
      `avatars/${targetUserId}`,
    );

    return new Response(Buffer.concat(chunks), {
      headers: {
        "Content-Type": metadata.metaData?.["content-type"] ?? "image/jpeg",
        "Cache-Control": "private, no-store, max-age=0",
        "Vary": "Cookie, Authorization",
      },
    });
  } catch {
    return Response.json({ error: "Avatar not found" }, { status: 404 });
  }
}

export async function POST(request: NextRequest) {
  const user = await requireCurrentUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    return Response.json({ error: "Avatar file is required" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return Response.json({ error: "Only JPG and PNG images are allowed" }, { status: 415 });
  }
  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    return Response.json({ error: "Image must be smaller than 2 MB" }, { status: 413 });
  }

  const objectKey = `avatars/${user.id}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await getMinioClient().putObject(
    MINIO_BUCKET,
    objectKey,
    buffer,
    buffer.length,
    { "Content-Type": file.type },
  );

  const avatarUrl = `/api/profile/avatar?userId=${encodeURIComponent(user.id)}`;
  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl },
  });

  return Response.json({ avatarUrl });
}
