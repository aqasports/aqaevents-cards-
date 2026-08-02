import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import {
  verifyPassword,
  isLockedOut,
  recordFailedAttempt,
  resetAttempts,
  getLockoutTimeRemaining,
} from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        token: { label: "Magic Token", type: "text" },
        orgId: { label: "Organization ID", type: "text" },
        loginType: { label: "Login Type", type: "text" },
      },
      async authorize(credentials) {
        // ── 1. Magic Link Authentication (OrganizationUser) ────────────────
        if (credentials?.token) {
          const orgUser = await prisma.organizationUser.findFirst({
            where: {
              magicToken: credentials.token,
              magicTokenExp: { gte: new Date() },
              active: true,
            },
          });

          if (orgUser) {
            // Consume the magic token once used
            await prisma.organizationUser.update({
              where: { id: orgUser.id },
              data: { magicToken: null, magicTokenExp: null },
            });

            return {
              id: orgUser.id,
              email: orgUser.email,
              name: orgUser.email,
              role: orgUser.role,
              organizationId: orgUser.organizationId,
              userType: "org" as const,
            };
          }
          return null;
        }

        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email.trim().toLowerCase();

        // ── 2. Explicit Corporate Portal Login Path ─────────────────────────
        if (credentials?.loginType === "org" || credentials?.orgId) {
          const orgUser = await prisma.organizationUser.findFirst({
            where: {
              email,
              active: true,
              ...(credentials.orgId ? { organizationId: credentials.orgId } : {}),
            },
          });

          if (!orgUser || !orgUser.passwordHash) {
            await new Promise((r) => setTimeout(r, 1000));
            return null;
          }

          const valid = await verifyPassword(credentials.password, orgUser.passwordHash);
          if (!valid) {
            await new Promise((r) => setTimeout(r, 1000));
            return null;
          }

          return {
            id: orgUser.id,
            email: orgUser.email,
            name: orgUser.email,
            role: orgUser.role,
            organizationId: orgUser.organizationId,
            userType: "org" as const,
          };
        }

        // ── 3. Admin / Staff Login Path ─────────────────────────────────────
        if (await isLockedOut(email)) {
          const time = await getLockoutTimeRemaining(email);
          await logAdminAction(
            null,
            "LOGIN_BLOCKED_LOCKOUT",
            email,
            `Account locked. ${time}s remaining.`
          );
          throw new Error(`ACCOUNT_LOCKED:${time}`);
        }

        const adminUser = await prisma.adminUser.findUnique({
          where: { email },
        });

        if (!adminUser) {
          // Check if an OrganizationUser exists for this email as fallback
          const orgUser = await prisma.organizationUser.findFirst({
            where: { email, active: true },
          });

          if (orgUser && orgUser.passwordHash) {
            const valid = await verifyPassword(credentials.password, orgUser.passwordHash);
            if (valid) {
              return {
                id: orgUser.id,
                email: orgUser.email,
                name: orgUser.email,
                role: orgUser.role,
                organizationId: orgUser.organizationId,
                userType: "org" as const,
              };
            }
          }

          await new Promise((r) => setTimeout(r, 1000));
          await logAdminAction(
            null,
            "LOGIN_FAILED",
            email,
            "Unknown email address."
          );
          return null;
        }

        const valid = await verifyPassword(credentials.password, adminUser.passwordHash);
        if (!valid) {
          await recordFailedAttempt(email);
          const locked = await isLockedOut(email);
          if (locked) {
            const time = await getLockoutTimeRemaining(email);
            await logAdminAction(
              null,
              "LOGIN_BLOCKED_LOCKOUT",
              email,
              `Account locked after too many failed attempts. ${time}s remaining.`
            );
            throw new Error(`ACCOUNT_LOCKED:${time}`);
          }
          await logAdminAction(
            null,
            "LOGIN_FAILED",
            email,
            "Incorrect password."
          );
          await new Promise((r) => setTimeout(r, 1000));
          return null;
        }

        await resetAttempts(email);

        return {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          role: adminUser.role,
          organizationId: null,
          userType: "admin" as const,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "staff";
        token.organizationId = (user as { organizationId?: string | null }).organizationId ?? null;
        token.userType = (user as { userType?: "admin" | "org" }).userType ?? "admin";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.organizationId = (token.organizationId as string) || null;
        session.user.userType = (token.userType as "admin" | "org") || "admin";
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      await logAdminAction(
        user.id ?? null,
        "LOGIN_SUCCESS",
        user.email ?? "unknown",
        `User signed in (${(user as any).userType ?? "admin"}).`
      );
    },
    async signOut({ token }) {
      await logAdminAction(
        (token?.id as string) ?? null,
        "LOGOUT",
        (token?.email as string) ?? "unknown",
        "User signed out."
      );
    },
  },
};

