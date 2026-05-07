import { env } from "@/lib/env";

export type OAuthProviderFlags = {
  google: boolean;
  github: boolean;
};

export function getEnabledOAuthProviders(): OAuthProviderFlags {
  return {
    google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    github: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET)
  };
}
