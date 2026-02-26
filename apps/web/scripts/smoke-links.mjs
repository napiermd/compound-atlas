#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";

const webDir = process.cwd();
const repoRoot = join(webDir, "../..");
const appDir = join(webDir, "app");
const port = Number(process.env.SMOKE_PORT || 4011);
const baseUrl = `http://127.0.0.1:${port}`;
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 90_000);
const maxDynamic = Number(process.env.SMOKE_DYNAMIC_LIMIT || 30);
const maxPages = Number(process.env.SMOKE_PAGE_LIMIT || 80);

const seedRoutes = ["/", "/compounds", "/stacks", "/research", "/cycles", "/login"];

function log(msg) {
  console.log(`[smoke:links] ${msg}`);
}

function normalizePath(raw) {
  if (!raw) return null;
  if (/^(mailto:|tel:|javascript:)/i.test(raw)) return null;
  let out = raw.trim();
  if (!out) return null;

  if (/^https?:\/\//i.test(out)) {
    const url = new URL(out);
    if (url.origin !== baseUrl) return null;
    out = `${url.pathname}${url.search}${url.hash}`;
  }

  if (!out.startsWith("/")) return null;
  const hashIdx = out.indexOf("#");
  if (hashIdx >= 0) out = out.slice(0, hashIdx);
  const qIdx = out.indexOf("?");
  if (qIdx >= 0) out = out.slice(0, qIdx);
  out = out.replace(/\/+$/g, "") || "/";
  return out;
}

function extractInternalLinks(html) {
  const links = new Set();
  const re = /<(a|button)\b[^>]*?(?:href|data-href)=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const p = normalizePath(m[2]);
    if (p) links.add(p);
  }
  return [...links];
}

function collectRoutePatterns() {
  const patterns = [];

  function walk(dir, segments = []) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const name = entry.name;
      if (name.startsWith("(") || name.startsWith("@")) {
        walk(join(dir, name), segments);
        continue;
      }
      if (name.startsWith("_")) continue;

      const nextSegments = [...segments, name];
      const hasPage = existsSync(join(dir, name, "page.tsx")) || existsSync(join(dir, name, "page.ts"));
      if (hasPage) {
        const regexParts = nextSegments
          .filter((s) => !s.startsWith("("))
          .map((s) => {
            if (/^\[\.\.\..+\]$/.test(s)) return "(?:.+)";
            if (/^\[.+\]$/.test(s)) return "[^/]+";
            return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          });
        const pat = `^/${regexParts.join("/")}/?$`;
        patterns.push(new RegExp(pat));
      }

      walk(join(dir, name), nextSegments);
    }
  }

  if (existsSync(join(appDir, "page.tsx")) || existsSync(join(appDir, "page.ts"))) {
    patterns.push(/^\/$/);
  }
  walk(appDir, []);
  return patterns;
}

function hasRoute(pathname, patterns) {
  if (pathname.startsWith("/api")) return true;
  return patterns.some((r) => r.test(pathname));
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

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`))));
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
    log(`WARN Build failed (${err.message}). Falling back to dev server crawl.`);
    return false;
  }
}

function readMissingEnv() {
  const missing = [];
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) missing.push("AUTH_SECRET|NEXTAUTH_SECRET");
  return missing;
}

async function getPath(pathname) {
  const res = await fetch(`${baseUrl}${pathname}`, { redirect: "follow" });
  const text = await res.text();
  return { status: res.status, text, finalUrl: res.url };
}

async function main() {
  const missingEnv = readMissingEnv();
  if (missingEnv.length > 0) {
    log(`SKIP Missing required env for app boot: ${missingEnv.join(", ")}`);
    process.exit(0);
  }

  const hasProdBuild = await ensureBuildExists();
  const serverCommand = hasProdBuild ? ["run", "start", "--", "-p", String(port)] : ["run", "dev", "--", "-p", String(port)];

  log(`Starting ${hasProdBuild ? "production" : "development"} server for link smoke check...`);
  const server = spawn("npm", serverCommand, {
    cwd: webDir,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

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

  const routePatterns = collectRoutePatterns();
  const visited = new Set();
  const queue = [...seedRoutes];
  const discoveredDynamic = [];
  const broken = [];

  try {
    await waitForServer(`${baseUrl}/`, timeoutMs);
    log(`Server is ready at ${baseUrl}`);

    while (queue.length > 0 && visited.size < maxPages) {
      const pathname = queue.shift();
      if (!pathname || visited.has(pathname)) continue;
      visited.add(pathname);

      const { status, text } = await getPath(pathname);
      if (status >= 400) {
        broken.push({ path: pathname, reason: `HTTP ${status}` });
        log(`FAIL ${pathname} -> ${status}`);
        continue;
      }

      log(`PASS ${pathname} -> ${status}`);
      const links = extractInternalLinks(text);
      for (const link of links) {
        if (!visited.has(link) && !queue.includes(link)) {
          if (!seedRoutes.includes(link) && discoveredDynamic.length < maxDynamic) {
            discoveredDynamic.push(link);
            queue.push(link);
          } else if (seedRoutes.includes(link)) {
            queue.push(link);
          }
        }
      }
    }

    const toValidate = [...new Set([...seedRoutes, ...discoveredDynamic])];
    for (const path of toValidate) {
      if (!hasRoute(path, routePatterns)) {
        broken.push({ path, reason: "No matching app route" });
      }
    }

    if (broken.length > 0) {
      log("Broken links found:");
      for (const b of broken) log(` - ${b.path}: ${b.reason}`);
      process.exitCode = 1;
    } else {
      log(`Link smoke check passed. Checked ${toValidate.length} unique internal routes.`);
      process.exitCode = 0;
    }

    log(`Discovered dynamic links (${discoveredDynamic.length}): ${discoveredDynamic.join(", ") || "none"}`);
  } finally {
    stopServer();
  }
}

main().catch((err) => {
  console.error(`[smoke:links] Error: ${err?.stack || err}`);
  process.exit(1);
});
