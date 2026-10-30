import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn(async () => null) }));

const { default: AdminPanelLayout } = await import("@/app/admin/(panel)/layout");

describe("admin layout", () => {
  it("redirects without session to /admin/login", async () => {
    const error = await AdminPanelLayout({ children: null }).then(
      () => null,
      (e: unknown) => e as { digest?: string },
    );
    expect(error?.digest).toMatch(/^NEXT_REDIRECT;[a-z]+;\/admin\/login;307;/);
  });
});
