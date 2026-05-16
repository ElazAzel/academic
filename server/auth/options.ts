import type { AuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { RoleKey } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { isActiveUserStatus } from "@/lib/auth/user-status";
import { AUTH_ROUTES } from "@/lib/constants";
import { env } from "@/lib/env";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getEnabledOAuthProviders } from "@/server/auth/provider-flags";

const prisma = getPrisma();

const providers: NonNullable<AuthOptions["providers"]> = [
  CredentialsProvider({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" }
    },
    async authorize(credentials) {
      const email = credentials?.email?.toLowerCase().trim();
      const password = credentials?.password;
      if (!email || !password) {
        return null;
      }
      const rl = await checkRateLimit(`login:${email}`);
      if (!rl.allowed) {
        return null;
      }
      const user = await prisma.user.findUnique({
        where: { email },
        include: { roles: { include: { role: true } } }
      });
      if (!user?.passwordHash || !isActiveUserStatus(user.status)) {
        return null;
      }
      const valid = await verifyPassword(user.passwordHash, password);
      if (!valid) {
        return null;
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });
      const roles: RoleKey[] = user.roles.map((entry) => entry.role.key);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        roles
      };
    }
  })
];

const enabledOAuthProviders = getEnabledOAuthProviders();

if (enabledOAuthProviders.google && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET
    })
  );
}

if (enabledOAuthProviders.github && env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET
    })
  );
}

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  secret: env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: AUTH_ROUTES.LOGIN
  },
  providers,
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google" || account?.provider === "github") {
        const email = profile?.email?.toLowerCase().trim();
        if (!email) return false;
        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, status: true }
        });
        if (!user || !isActiveUserStatus(user.status)) return false;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const userId = user.id ?? token.sub;
        if (userId) {
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            include: { roles: { include: { role: true } } }
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.roles = dbUser.roles.map((r) => r.role.key);
            token.email = dbUser.email;
            token.name = dbUser.name;
            token.picture = dbUser.image;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.roles = (token.roles as RoleKey[]) ?? [];
        session.user.email = token.email as string;
        session.user.name = token.name as string | null;
        session.user.image = token.picture as string | null;
      }
      return session;
    }
  }
};
