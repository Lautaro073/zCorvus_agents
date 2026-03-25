#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  try {
    const envPath = path.resolve(__dirname, "..", "..", ".env");
    const raw = fs.readFileSync(envPath, "utf-8");
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {}
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { base: null, state: "open" };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--base" && args[i + 1]) {
      result.base = args[i + 1];
      i++;
    } else if (arg === "--state" && args[i + 1]) {
      result.state = args[i + 1];
      i++;
    }
  }
  
  return result;
}

async function listPRs(owner, repo, token, base, state) {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=${state}&base=${base}`;
  
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });
  
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

async function main() {
  loadEnv();
  const args = parseArgs();
  
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN not found in .env");
  }
  
  // Get owner/repo from git remote
  const gitDir = path.resolve(__dirname, "..", "..");
  let owner = "Lautaro073";
  let repo = "zCorvus_agents";
  
  try {
    const remoteUrl = require("child_process").execSync(`git remote get-url origin`, { cwd: gitDir, encoding: "utf8" }).trim();
    const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (match) {
      owner = match[1];
      repo = match[2];
    }
  } catch {}
  
  const prs = await listPRs(owner, repo, token, args.base, args.state);
  
  console.log(`\n=== Open PRs to ${args.base} ===\n`);
  
  if (prs.length === 0) {
    console.log("No open PRs found.");
    return;
  }
  
  for (const pr of prs) {
    console.log(`#${pr.number}: ${pr.title}`);
    console.log(`  Branch: ${pr.head.ref} → ${pr.base.ref}`);
    console.log(`  Author: ${pr.user.login}`);
    console.log(`  URL: ${pr.html_url}`);
    console.log("");
  }
  
  console.log(`Total: ${prs.length} PR(s)\n`);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
