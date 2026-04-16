import { NextResponse } from "next/server";

/**
 * Expone valores de configuración pública al frontend.
 * El Google Client ID es un valor público (embebido en la web de todas formas).
 */
export async function GET() {
  return NextResponse.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? null,
  });
}
