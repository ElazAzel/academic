import type { AuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { RoleKey } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { env } from "@/lib/env";
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
      const user = await prisma.user.findUnique({
        where: { email },
        include: { roles: { include: { role: true } } }
      });
      if (!user?.passwordHash) {
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
    signIn: "/login"
  },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      if (user?.roles) {
        token.roles = user.roles;
      }
      if (typeof token.id === "string" && (!Array.isArray(token.roles) || token.roles.length === 0)) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          include: { roles: { include: { role: true } } }
        });
        token.roles = dbUser?.roles.map((entry) => entry.role.key) ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id && typeof token.id === "string") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          include: { roles: { include: { role: true } } }
        });
        if (session.user && dbUser) {
          session.user.id = dbUser.id;
          session.user.email = dbUser.email;
          session.user.name = dbUser.name;
          session.user.image = dbUser.image;
          session.user.roles = dbUser.roles.map((entry) => entry.role.key);
        }
      }
      return session;
    }
  }
};
