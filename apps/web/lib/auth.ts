import NextAuth, { type NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GitHub from "next-auth/providers/github";
import Resend from "next-auth/providers/resend";
import { db } from "./db";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const hasGitHub = Boolean(process.env.GITHUB_ID && process.env.GITHUB_SECRET);
const hasResend = Boolean(process.env.AUTH_RESEND_KEY);

const providers: NextAuthConfig["providers"] = [];

if (hasGitHub) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    })
  );
}

if (hasResend) {
  providers.push(
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.EMAIL_FROM ?? "CompoundAtlas <noreply@resend.dev>",
    })
  );
}

const authConfig: NextAuthConfig = {
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
    error: "/login",
  },
};

// Auth flows require a DB adapter for accounts, sessions, and verification tokens.
if (hasDatabase) {
  authConfig.adapter = PrismaAdapter(db);
}

const nextAuth = NextAuth(authConfig);

export const handlers = nextAuth.handlers;
export const signOut = nextAuth.signOut;

const authBase = nextAuth.auth;
export const auth = (async (...args: Parameters<typeof authBase>) => {
  try {
    return await authBase(...args);
  } catch {
    return null;
  }
}) as typeof authBase;

const signInBase = nextAuth.signIn;
export const signIn = (async (...args: Parameters<typeof signInBase>) => {
  if (!hasDatabase) {
    throw new Error("AuthUnavailable");
  }

  try {
    return await signInBase(...args);
  } catch {
    throw new Error("AuthUnavailable");
  }
}) as typeof signInBase;

export const authAvailability = {
  hasDatabase,
  hasGitHub,
  hasResend,
  githubEnabled: hasDatabase && hasGitHub,
  emailEnabled: hasDatabase && hasResend,
};
