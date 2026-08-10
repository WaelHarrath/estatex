import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

/** Returns the session user or null (use in API route handlers). */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ? (session.user as SessionUser) : null;
}

/** Redirects to /login when unauthenticated (use in pages and server actions). */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
