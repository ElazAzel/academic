export type OAuthProviderFlags = {
  google: boolean;
  github: boolean;
};

export function getEnabledOAuthProviders(): OAuthProviderFlags {
  return {
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    github: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)
  };
}
