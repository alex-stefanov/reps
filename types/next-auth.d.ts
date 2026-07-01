import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      githubId: string;
      githubHandle: string;
      avatarUrl: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    githubId?: string;
    githubHandle?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    githubId?: string;
    githubHandle?: string;
    avatarUrl?: string | null;
  }
}
