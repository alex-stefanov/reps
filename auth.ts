import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";

/**
 * Sign-in is GitHub OAuth only: the product needs the user's GitHub handle
 * for commit verification (spec §13), and OAuth hands us a verified one.
 *
 * The "dev" credentials provider exists so local dev and Playwright can run
 * without a registered OAuth app. It is compiled out of production builds.
 */
export const devAuthEnabled =
  process.env.AUTH_DEV_MODE === "true" && process.env.NODE_ENV !== "production";

const providers: Provider[] = [GitHub];

if (devAuthEnabled) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Dev sign-in",
      credentials: { handle: { label: "GitHub handle" } },
      authorize(credentials) {
        const handle = credentials?.handle?.toString().trim();
        if (!handle) return null;
        return {
          id: `dev:${handle}`,
          name: handle,
          githubId: `dev:${handle}`,
          githubHandle: handle,
        };
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  trustHost: true,
  secret:
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV !== "production" ? "reps-dev-only-secret" : undefined),
  pages: { signIn: "/signin" },
  callbacks: {
    jwt({ token, account, profile, user }) {
      if (account?.provider === "github" && profile) {
        const gh = profile as {
          id?: number;
          login?: string;
          avatar_url?: string;
        };
        token.githubId = String(gh.id ?? "");
        token.githubHandle = gh.login ?? "";
        token.avatarUrl = gh.avatar_url ?? null;
      }
      if (account?.provider === "dev" && user) {
        const dev = user as { githubId: string; githubHandle: string };
        token.githubId = dev.githubId;
        token.githubHandle = dev.githubHandle;
        token.avatarUrl = null;
      }
      return token;
    },
    session({ session, token }) {
      session.user.githubId = (token.githubId as string) ?? "";
      session.user.githubHandle = (token.githubHandle as string) ?? "";
      session.user.avatarUrl = (token.avatarUrl as string | null) ?? null;
      return session;
    },
  },
});
