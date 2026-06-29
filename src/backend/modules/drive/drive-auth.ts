import type { NextRequest } from "next/server";
import { createContext } from "@/graphql/context";

export async function requestUser(request: NextRequest) {
  const { currentUser } = await createContext(request);
  return currentUser;
}

export async function requestAdmin(request: NextRequest) {
  const user = await requestUser(request);
  return user?.roles.includes("ADMIN") ? user : null;
}
