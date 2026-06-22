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
import {
  isAuthDeviceSessionActive,
  registerAuthDeviceSession,
} from "@/server/modules/auth/device-sessions";

const prisma = getPrisma();

type HeaderBag = Headers | Record<string, string | string[] | undefined>;

function readHeader(headers: HeaderBag | undefined, name: string) {
  if (!headers) return null;
  if (headers instanceof Headers) {
    return headers.get(name);
  }

  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function getLoginContext(request: unknown) {
  const headers = typeof request === "object" && request !== null && "headers" in request
    ? (request as { headers?: HeaderBag }).headers
    : undefined;
  const forwardedFor = readHeader(headers, "x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim()
    ?? readHeader(headers, "x-real-ip")
    ?? null;
  const userAgent = readHeader(headers, "user-agent");

  return { ipAddress, userAgent };
}

function readString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

const providers: NonNullable<AuthOptions["providers"]> = [
  CredentialsProvider({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" }
    },
    async authorize(credentials, request) {
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
      const loginContext = getLoginContext(request);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        roles,
        requires2fa: user.totpEnabled === true,
        ...(loginContext.ipAddress ? { loginIpAddress: loginContext.ipAddress } : {}),
        ...(loginContext.userAgent ? { loginUserAgent: loginContext.userAgent } : {}),
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
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days — JWT expires
    updateAge: 24 * 60 * 60,   // refresh session once per day
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
    async jwt({ token, user, trigger }) {
      // Validate token age: reject tokens older than maxAge (for backward compat with sessions created before maxAge was set)
      if (trigger === "update" && token.iat) {
        const now = Math.floor(Date.now() / 1000);
        const maxAgeSec = 7 * 24 * 60 * 60;
        const iat = Number(token.iat);
        if (now - iat > maxAgeSec) {
          return {};
        }
      }

      if (user) {
        // User data already available from authorize — skip redundant DB query
        const u = user as typeof user & { requires2fa?: boolean };
        token.id = u.id;
        token.roles = u.roles;
        token.email = u.email;
        token.name = u.name;
        token.picture = u.image;
        token.requires2fa = u.requires2fa === true;
      } else if (trigger !== "signIn") {
        // Subsequent requests: refresh from DB only when needed
        const userId = readString(token.id) ?? readString(token.sub);
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
            token.requires2fa = dbUser.totpEnabled === true;
          }
        }
      }
      const tokenUserId = readString(token.id) ?? readString(token.sub);
      const tokenDeviceSessionId = readString(token.authDeviceSessionId);
      const shouldCreateDeviceSession = Boolean(user) || !tokenDeviceSessionId;
      if (tokenUserId && !token.id) {
        token.id = tokenUserId;
      }

      if (token.requires2fa === true && !tokenDeviceSessionId) {
        return token;
      }

      if (tokenUserId && shouldCreateDeviceSession) {
        const deviceSession = await registerAuthDeviceSession({
          userId: tokenUserId,
          ipAddress: readString(user?.loginIpAddress) ?? null,
          userAgent: readString(user?.loginUserAgent) ?? null,
        });
        token.authDeviceSessionId = deviceSession.id;
        token.authDeviceSessionStartedAt = deviceSession.startedAt.toISOString();
        token.authDeviceSessionRevoked = false;
      } else if (tokenUserId && tokenDeviceSessionId) {
        const active = await isAuthDeviceSessionActive(tokenUserId, tokenDeviceSessionId);
        token.authDeviceSessionRevoked = !active;
      }

      return token;
    },
    async session({ session, token }) {
      session.authDeviceSessionRevoked = token.authDeviceSessionRevoked === true;

      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.roles = (token.roles as RoleKey[]) ?? [];
        session.user.email = token.email as string;
        session.user.name = token.name as string | null;
        session.user.image = token.picture as string | null;
        session.user.authDeviceSessionId = token.authDeviceSessionId as string | undefined;
        session.authDeviceSessionId = token.authDeviceSessionId as string | undefined;
        session.requires2fa = token.requires2fa as boolean | undefined;
      }
      return session;
    }
  }
};
