// Concatenates all .ts / .tsx / .sql files in the project into a single
// text file (zodiac_codebase_export.txt) for feeding into NotebookLM.
//
// Usage: npm run export:codebase

import { readdirSync, statSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUTPUT_FILE = path.join(ROOT, "zodiac_codebase_export.txt");

const EXTENSIONS = new Set([".ts", ".tsx", ".sql"]);

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "out",
  "build",
  "coverage",
  ".vercel",
  ".yarn",
]);

function collectFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry)) {
        collectFiles(fullPath, files);
      }
      continue;
    }

    const ext = path.extname(entry);
    if (EXTENSIONS.has(ext) && !entry.endsWith(".d.ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

function main() {
  const files = collectFiles(ROOT).sort((a, b) => a.localeCompare(b));

  const parts = [];
  parts.push(`ZODIAC LEAGUE TOURNAMENTS — CODEBASE EXPORT`);
  parts.push(`Generated: ${new Date().toISOString()}`);
  parts.push(`Total files: ${files.length}`);
  parts.push("");

  for (const filePath of files) {
    const relPath = path.relative(ROOT, filePath).split(path.sep).join("/");
    const content = readFileSync(filePath, "utf8");

    parts.push("=".repeat(80));
    parts.push(`FILE: ${relPath}`);
    parts.push("=".repeat(80));
    parts.push(content);
    parts.push("");
  }

  writeFileSync(OUTPUT_FILE, parts.join("\n"), "utf8");
  console.log(`Exported ${files.length} files -> ${path.relative(ROOT, OUTPUT_FILE)}`);
}

main();
