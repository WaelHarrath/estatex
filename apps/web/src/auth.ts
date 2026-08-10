import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma, verifyPassword } from "@estatex/core";

// Google OAuth is opt-in: the stack boots without credentials and the
// "Continue with Google" button only appears when both env vars exist.
const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      }
    }),
    ...(googleEnabled
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string
          })
        ]
      : [])
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // On sign-in (account present): credentials users carry id/role;
      // OAuth users need a matching DB row so token.id/role are real.
      if (user && account) {
        if (user.email && !("role" in user)) {
          const email = user.email.toLowerCase().trim();
          let dbUser = await prisma.user.findUnique({ where: { email } });
          if (!dbUser) {
            dbUser = await prisma.user.create({
              data: {
                name: user.name ?? (email.split("@")[0] || "EstateX Member"),
                email,
                passwordHash: "", // OAuth users never authenticate by password
                role: "BUYER"
              }
            });
          }
          await prisma.wallet.upsert({
            where: { userId: dbUser.id },
            update: {},
            create: { userId: dbUser.id }
          });
          token.id = dbUser.id;
          token.role = dbUser.role;
        } else {
          token.id = user.id;
          token.role = user.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? "";
        session.user.role = token.role ?? "BUYER";
      }
      return session;
    }
  }
};
