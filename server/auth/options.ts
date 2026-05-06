import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
// @ts-ignore
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { getPrisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { env } from "@/lib/env";

const prisma = getPrisma();

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  secret: env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login"
  },
  providers: [
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
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          roles: user.roles.map((entry: { role: { key: string } }) => entry.role.key)
        };
      }
    }),
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID ?? "not-configured",
      clientSecret: env.GOOGLE_CLIENT_SECRET ?? "not-configured"
    }),
    GitHubProvider({
      clientId: env.GITHUB_CLIENT_ID ?? "not-configured",
      clientSecret: env.GITHUB_CLIENT_SECRET ?? "not-configured"
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
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
          session.user.roles = dbUser.roles.map((entry: { role: { key: string } }) => entry.role.key);
        }
      }
      return session;
    }
  }
};

