import { NextResponse, type NextRequest } from "next/server";

/**
 * invariant: the admin surface answers only on ADMIN_HOST, the tailnet-only
 * address that `tailscale serve` forwards. The public Caddy site sends its own
 * domain as Host, so admin paths there are 404 even if Caddy's block is removed.
 */
export function proxy(request: NextRequest) {
  const adminHost = process.env.ADMIN_HOST?.trim();
  if (!adminHost || request.headers.get("host") !== adminHost) {
    return new NextResponse(null, { status: 404 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/auth/:path*"],
};
