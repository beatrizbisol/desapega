import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// why: read at call time so a changed ALLOWED_EMAILS applies without a rebuild.
function allowedEmails() {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export const authConfig = {
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/admin/login", error: "/admin/login" },
  providers: [Google],
  callbacks: {
    signIn({ profile }) {
      const email = profile?.email?.toLowerCase();
      if (!email || profile?.email_verified === false) return false;
      return allowedEmails().includes(email);
    },
  },
} satisfies NextAuthConfig;
