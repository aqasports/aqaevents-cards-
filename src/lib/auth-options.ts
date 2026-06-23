import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import {
  verifyPassword,
  isLockedOut,
  recordFailedAttempt,
  resetAttempts,
  getLockoutTimeRemaining,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email.toLowerCase();

        // Check if locked out
        if (isLockedOut(email)) {
          const time = getLockoutTimeRemaining(email);
          throw new Error(`ACCOUNT_LOCKED:${time}`);
        }

        const user = await prisma.adminUser.findUnique({
          where: { email },
        });

        if (!user) {
          // Dynamic delay for non-existent users to prevent timing attacks
          await new Promise((r) => setTimeout(r, 1000));
          return null;
        }

        const valid = await verifyPassword(credentials.password, user.passwordHash);
        if (!valid) {
          recordFailedAttempt(email);
          if (isLockedOut(email)) {
            const time = getLockoutTimeRemaining(email);
            throw new Error(`ACCOUNT_LOCKED:${time}`);
          }
          // Delay to slow down brute force
          await new Promise((r) => setTimeout(r, 1000));
          return null;
        }

        resetAttempts(email);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "staff";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};
