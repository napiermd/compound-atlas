import test from "node:test";
import assert from "node:assert/strict";

const ENV_KEYS = ["DATABASE_URL", "AUTH_RESEND_KEY", "GITHUB_ID", "GITHUB_SECRET"] as const;

test("auth helpers do not crash when env providers are missing", async () => {
  const before = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

  for (const key of ENV_KEYS) delete process.env[key];

  try {
    const mod = await import(`./auth.ts?ts=${Date.now()}-${Math.random()}`);

    const session = await mod.auth();
    assert.equal(session, null);

    await assert.rejects(() => mod.signIn("github", { redirectTo: "/" }), /AuthUnavailable/);
  } finally {
    for (const key of ENV_KEYS) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
  }
});
