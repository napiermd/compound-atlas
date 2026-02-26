#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const webDir = process.cwd();
const repoRoot = join(webDir, "../..");
const port = Number(process.env.SMOKE_PORT || 4010);
const baseUrl = `http://127.0.0.1:${port}`;
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 60_000);

function log(msg) {
  console.log(`[smoke] ${msg}`);
}

function findSeedSlug() {
  const compoundsDir = join(repoRoot, "packages/compound-data/compounds");
  if (!existsSync(compoundsDir)) return "caffeine";

  const firstYaml = readdirSync(compoundsDir)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
    .sort()[0];

  if (!firstYaml) return "caffeine";

  const contents = readFileSync(join(compoundsDir, firstYaml), "utf8");
  const slugMatch = contents.match(/^slug:\s*['"]?([^'"\n]+)['"]?/m);
  return slugMatch?.[1]?.trim() || "caffeine";
}

async function waitForServer(url, timeout) {
  const start = Date.now();
  let lastError;

  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status >= 100 && res.status < 600) return;
      lastError = new Error(`Unexpected status ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  throw new Error(`Server did not become ready in ${timeout}ms. Last error: ${lastError?.message || lastError}`);
}

async function checkRoute(pathname, { allowMissingSeed = false } = {}) {
  const res = await fetch(`${baseUrl}${pathname}`, { redirect: "follow" });

  if (res.status === 200) {
    log(`PASS ${pathname} -> 200`);
    return { ok: true };
  }

  if (allowMissingSeed && res.status === 404) {
    const body = await res.text();
    if (/not found|404/i.test(body)) {
      log(`WARN ${pathname} -> 404 (likely no seeded compound data in DB for dynamic route)`);
      return { ok: true, warning: true };
    }
  }

  log(`FAIL ${pathname} -> ${res.status}`);
  return { ok: false };
}

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

async function ensureBuildExists() {
  if (existsSync(join(webDir, ".next/BUILD_ID"))) return true;
  log("No Next production build detected. Running `npm run build`...");
  try {
    await runCommand("npm", ["run", "build"], webDir);
    return true;
  } catch (err) {
    log(`WARN Build failed (${err.message}). Falling back to dev server smoke check.`);
    return false;
  }
}

function readMissingEnv() {
  const missing = [];
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
    missing.push("AUTH_SECRET|NEXTAUTH_SECRET");
  }
  return missing;
}

async function main() {
  const missingEnv = readMissingEnv();
  if (missingEnv.length > 0) {
    log(`SKIP Missing required env for app boot: ${missingEnv.join(", ")}`);
    process.exit(0);
  }

  const seedSlug = process.env.SMOKE_SEED_SLUG || findSeedSlug();
  const routes = [
    "/",
    "/compounds",
    `/compounds/${seedSlug}`,
    "/stacks",
    "/research",
    "/login",
  ];

  log(`Using seed slug: ${seedSlug}`);
  const hasProdBuild = await ensureBuildExists();

  const serverCommand = hasProdBuild
    ? ["run", "start", "--", "-p", String(port)]
    : ["run", "dev", "--", "-p", String(port)];

  log(`Starting ${hasProdBuild ? "production" : "development"} server for smoke check...`);
  const server = spawn("npm", serverCommand, {
    cwd: webDir,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  let failed = false;

  const stopServer = () => {
    if (!server.killed) server.kill("SIGTERM");
  };

  process.on("SIGINT", () => {
    stopServer();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    stopServer();
    process.exit(143);
  });

  try {
    await waitForServer(`${baseUrl}/`, timeoutMs);
    log(`Server is ready at ${baseUrl}`);

    for (const route of routes) {
      const result = await checkRoute(route, {
        allowMissingSeed: route.startsWith("/compounds/"),
      });
      if (!result.ok) failed = true;
    }
  } finally {
    stopServer();
  }

  if (failed) {
    log("Route smoke check failed.");
    process.exit(1);
  }

  log("Route smoke check passed.");
}

main().catch((err) => {
  console.error(`[smoke] Error: ${err?.stack || err}`);
  process.exit(1);
});
