import { describe, expect, it } from "vitest";

import { signSession, verifySession } from "./token";

describe("session tokens", () => {
  const payload = { sid: "s1", uid: "usr_demo", exp: 2_000_000_000 };

  it("round-trips a signed payload", async () => {
    const token = await signSession(payload);
    expect(await verifySession(token, 1_900_000_000)).toEqual(payload);
  });

  it("rejects expired tokens", async () => {
    const token = await signSession(payload);
    expect(await verifySession(token, 2_000_000_001)).toBeNull();
  });

  it("rejects tampered payloads and signatures", async () => {
    const token = await signSession(payload);
    const [body, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...payload, uid: "usr_admin" })).toString(
      "base64url",
    );
    expect(await verifySession(`${forged}.${sig}`, 1)).toBeNull();
    expect(await verifySession(`${body}.${sig!.slice(0, -2)}xx`, 1)).toBeNull();
    expect(await verifySession("garbage", 1)).toBeNull();
    expect(await verifySession(undefined, 1)).toBeNull();
  });
});
