import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn(async () => null) }));
const listOrders = vi.hoisted(() => vi.fn(async () => []));
vi.mock("@/lib/store", () => ({ listItems: vi.fn(async () => []), listOrders }));

const { default: AdminPage } = await import("@/app/admin/(panel)/page");

describe("admin page", () => {
  it("page guard: without session it redirects before reading any order", async () => {
    const error = await AdminPage().then(
      () => null,
      (e: unknown) => e as { digest?: string },
    );
    expect(error?.digest).toMatch(/^NEXT_REDIRECT;[a-z]+;\/admin\/login;307;/);
    expect(listOrders).not.toHaveBeenCalled();
  });
});
