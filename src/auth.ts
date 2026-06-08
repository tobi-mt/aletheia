import { getServerSession, type NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
import { createHash } from "node:crypto";

const googleClientId = process.env.AUTH_GOOGLE_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET;
const googleConfigured = Boolean(googleClientId && googleClientSecret);
const explicitAuthSecret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
const derivedLocalSecret = createHash("sha256")
  .update(process.env.DATABASE_URL || "aletheia-local-dev")
  .digest("hex");

export const authOptions: NextAuthOptions = {
  secret: explicitAuthSecret ?? (process.env.NODE_ENV === "production" ? undefined : derivedLocalSecret),
  pages: {
    signIn: "/",
    error: "/",
  },
  session: {
    strategy: "jwt",
  },
  providers: googleConfigured
    ? [
        Google({
          clientId: googleClientId!,
          clientSecret: googleClientSecret!,
        }),
      ]
    : [],
  callbacks: {
    async jwt({ token, profile }) {
      if (profile?.email) {
        token.email = profile.email;
        token.name = profile.name ?? token.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email ?? session.user.email;
        session.user.name = token.name ?? session.user.name;
      }
      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}
