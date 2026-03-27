// GraphQL API Route — Apollo Server endpoint
// TODO: Configurar Apollo Server aquí
// Ref: https://www.apollographql.com/docs/apollo-server/integrations/next-js

import { NextRequest, NextResponse } from "next/server";

// Placeholder — reemplazar con Apollo Server en implementación
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { message: "GraphQL endpoint — Apollo Server pendiente de configurar" },
    { status: 501 }
  );
}

export async function GET() {
  return NextResponse.json(
    { message: "GraphQL endpoint — usar POST para queries/mutations" },
    { status: 200 }
  );
}
