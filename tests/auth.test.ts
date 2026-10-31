import { afterEach, describe, expect, it } from "vitest";
import { authConfig } from "@/auth.config";

const signIn = (email: string) =>
  authConfig.callbacks!.signIn!({
    profile: { email, email_verified: true },
  } as Parameters<NonNullable<NonNullable<typeof authConfig.callbacks>["signIn"]>>[0]);

afterEach(() => {
  delete process.env.ALLOWED_EMAILS;
});

describe("auth", () => {
  it("signIn allowlist: case-insensitive match, others refused, empty list refuses all", async () => {
    process.env.ALLOWED_EMAILS = "filipemlins@gmail.com";
    expect(await signIn("FilipeMLins@gmail.com")).toBe(true);
    expect(await signIn("outro@gmail.com")).toBe(false);

    process.env.ALLOWED_EMAILS = "";
    expect(await signIn("filipemlins@gmail.com")).toBe(false);
  });
});
