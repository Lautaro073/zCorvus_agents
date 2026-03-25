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
  let prNumber = null;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--pr" && args[i + 1]) {
      prNumber = parseInt(args[i + 1], 10);
      i++;
    }
  }
  
  if (!prNumber) {
    throw new Error("--pr <number> is required");
  }
  
  return prNumber;
}

async function approvePR(owner, repo, token, prNumber) {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    body: JSON.stringify({
      event: "APPROVE",
      body: "LGTM - Approved by Orchestrator"
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

async function main() {
  loadEnv();
  const prNumber = parseArgs();
  
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN not found in .env");
  }
  
  const owner = "Lautaro073";
  const repo = "zCorvus_agents";
  
  console.log(`Approving PR #${prNumber}...`);
  
  const result = await approvePR(owner, repo, token, prNumber);
  
  console.log(`✅ PR #${prNumber} approved!`);
  console.log(`   State: ${result.state}`);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
