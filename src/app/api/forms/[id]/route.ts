import { NextRequest, NextResponse } from "next/server";
import { getMinioClient, MINIO_BUCKET } from "@/lib/minio";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const client = getMinioClient();
    const stream = await client.getObject(MINIO_BUCKET, `forms/${id}.json`);

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const config = JSON.parse(Buffer.concat(chunks).toString("utf-8"));

    return NextResponse.json(config, {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch {
    return NextResponse.json(
      { error: `Form config '${id}' not found` },
      { status: 404 }
    );
  }
}
