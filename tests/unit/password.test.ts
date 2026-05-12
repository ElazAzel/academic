import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("hashes and verifies correct password", async () => {
    const password = "Str0ng!Pass";
    const hashed = await hashPassword(password);
    expect(hashed).toBeTruthy();
    expect(hashed).not.toContain(password);

    const valid = await verifyPassword(hashed, password);
    expect(valid).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hashed = await hashPassword("correct-password");
    const valid = await verifyPassword(hashed, "wrong-password");
    expect(valid).toBe(false);
  });

  it("produces different hashes for same password", async () => {
    const hash1 = await hashPassword("same-pass");
    const hash2 = await hashPassword("same-pass");
    expect(hash1).not.toBe(hash2);
  });
});
