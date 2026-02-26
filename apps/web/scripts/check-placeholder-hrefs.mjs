#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.cwd();
const SEARCH_DIRS = ["app", "components", "lib"];
const EXTS = new Set([".tsx", ".ts", ".jsx", ".js"]);

const placeholderHrefRegexes = [
  /href\s*=\s*["']\s*["']/g, // href="" or href=''
  /href\s*=\s*["']#["']/g,
  /href\s*=\s*["']javascript:void\(0\)["']/gi,
  /href\s*=\s*\{\s*["']\s*["']\s*\}/g,
  /href\s*=\s*\{\s*["']#["']\s*\}/g,
  /href\s*=\s*\{\s*["']javascript:void\(0\)["']\s*\}/gi,
];

function walk(dir, out = []) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      walk(full, out);
      continue;
    }
    if (EXTS.has(extname(full))) out.push(full);
  }
  return out;
}

function lineAt(content, index) {
  return content.slice(0, index).split("\n").length;
}

const failures = [];
for (const dir of SEARCH_DIRS) {
  const absDir = join(ROOT, dir);
  let files = [];
  try {
    files = walk(absDir);
  } catch {
    continue;
  }

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    for (const re of placeholderHrefRegexes) {
      for (const match of content.matchAll(re)) {
        const ln = lineAt(content, match.index ?? 0);
        failures.push({ file, line: ln, snippet: match[0] });
      }
    }
  }
}

if (failures.length > 0) {
  console.error("❌ Placeholder hrefs detected:");
  for (const f of failures) {
    console.error(`- ${f.file.replace(`${ROOT}/`, "")}:${f.line} (${f.snippet})`);
  }
  process.exit(1);
}

console.log("✅ No placeholder hrefs found.");
