import NextAuth, { type NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GitHub from "next-auth/providers/github";
import Resend from "next-auth/providers/resend";
import { db } from "./db";

const providers: NextAuthConfig["providers"] = [];

if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    })
  );
}

if (process.env.AUTH_RESEND_KEY) {
  providers.push(
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.EMAIL_FROM ?? "CompoundAtlas <noreply@resend.dev>",
    })
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  trustHost: true,
  providers,
  callbacks: {
    session({ session, user }) {
      if (user) session.user.id = user.id;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/login/verify",
  },
});
