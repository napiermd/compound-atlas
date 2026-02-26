import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";

const ENV_KEYS = ["DATABASE_URL", "AUTH_RESEND_KEY", "GITHUB_ID", "GITHUB_SECRET"] as const;

async function renderLoginWithEnv(overrides: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>) {
  const before = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

  for (const key of ENV_KEYS) {
    if (overrides[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = overrides[key];
    }
  }

  try {
    const mod = await import(`../app/(auth)/login/page.tsx?ts=${Date.now()}-${Math.random()}`);
    const Page = mod.default as (props?: { searchParams?: { error?: string } }) => React.JSX.Element;
    const element = Page({});
    return renderToStaticMarkup(element);
  } finally {
    for (const key of ENV_KEYS) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
  }
}

test("login page shows explicit unavailable messaging when auth env is missing", async () => {
  const html = await renderLoginWithEnv({});

  assert.match(html, /Login is temporarily unavailable because auth storage is not configured/i);
  assert.match(html, /Continue with Email \(Unavailable\)/i);
  assert.match(html, /Continue with GitHub \(Unavailable\)/i);
  assert.match(html, /Browse without signing in/i);
});

test("login page surfaces auth callback errors", async () => {
  const before = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  process.env.DATABASE_URL ??= "postgresql://example:example@localhost:5432/example";
  process.env.AUTH_RESEND_KEY ??= "re_test_key";

  try {
    const mod = await import(`../app/(auth)/login/page.tsx?ts=${Date.now()}-${Math.random()}`);
    const Page = mod.default as (props?: { searchParams?: { error?: string } }) => React.JSX.Element;
    const html = renderToStaticMarkup(Page({ searchParams: { error: "OAuthCallback" } }));

    assert.match(html, /Sign-in is temporarily unavailable/i);
  } finally {
    for (const key of ENV_KEYS) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
  }
});
