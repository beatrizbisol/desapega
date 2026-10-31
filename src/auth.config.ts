import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// why: read at call time so a changed ALLOWED_EMAILS applies without a rebuild.
function allowedEmails() {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * invariant: checked at sign-in and again on every admin request, so removing an
 * e-mail from ALLOWED_EMAILS locks that person out without waiting for their
 * 30-day session to expire.
 */
export function isAllowedEmail(email: string | null | undefined) {
  return !!email && allowedEmails().includes(email.toLowerCase());
}

export const authConfig = {
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/admin/login", error: "/admin/login" },
  providers: [Google],
  callbacks: {
    signIn({ profile }) {
      if (profile?.email_verified === false) return false;
      return isAllowedEmail(profile?.email);
    },
  },
} satisfies NextAuthConfig;
