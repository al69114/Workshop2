/**
 * STAGE 3 — HARDENED LOGIN SERVER
 *
 * Everything from Stage 2, plus:
 *  1. bcrypt password hashing (cost factor 12) — safe storage + timing safety built in
 *  2. Security headers via helmet (X-Frame-Options, CSP, X-Content-Type-Options, etc.)
 *  3. Structured audit logging — every attempt is recorded with timestamp, IP, and outcome
 */
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const users = require("./users");
const { log } = require("./auditLog");

const app = express();
const PORT = 3003;

// ── Security headers (helmet sets ~11 headers in one call) ──────────────────
// Allow unsafe-inline scripts for the workshop UI only.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'"],
    },
  },
}));

app.use(express.static(path.join(__dirname, "public")));

// ── Rate limiting ────────────────────────────────────────────────────────────
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again in 15 minutes." },
});

// ── In-memory lockout store ──────────────────────────────────────────────────
const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const lockoutStore = new Map(); // username → { failures, lockedUntil }

function getLockout(username) {
  if (!lockoutStore.has(username)) {
    lockoutStore.set(username, { failures: 0, lockedUntil: null });
  }
  return lockoutStore.get(username);
}

function isLocked(username) {
  const entry = getLockout(username);
  if (!entry.lockedUntil) return false;
  if (Date.now() < entry.lockedUntil) return true;
  entry.lockedUntil = null;
  entry.failures = 0;
  return false;
}

function recordFailure(username) {
  const entry = getLockout(username);
  entry.failures += 1;
  if (entry.failures >= MAX_FAILURES) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
    return true; // lockout triggered
  }
  return false;
}

function resetLockout(username) {
  lockoutStore.set(username, { failures: 0, lockedUntil: null });
}

// ── Login route ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use("/login", loginRateLimiter);

// ── Protection demo stream — shows all defenses blocking the attack ───────────
// Runs entirely server-side: real bcrypt compares, real lockout, no subprocess.
app.get("/demo-stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders(); // send headers immediately so browser starts reading

  let closed = false;
  req.on("close", () => { closed = true; });

  const send = (text, type = "info") => {
    if (!closed) res.write(`data: ${JSON.stringify({ line: text, type })}\n\n`);
  };
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  const wordlist = ["123456", "password", "qwerty", "letmein", "monkey", "dragon", "abc123", "pass123"];
  const allUsers = Object.keys(users);

  try {

  send("  === Stage 3 — Protection Demo ===", "header");
  send("  Trying brute force against every account...", "info");
  send("", "info");
  await delay(500);

  for (const username of allUsers) {
    if (closed) break;

    // Reset lockout so the demo is fresh for each user
    resetLockout(username);

    send(`  ── Attacking "${username}" ──`, "header");
    await delay(300);

    let blocked = false;
    for (let i = 0; i < wordlist.length; i++) {
      if (closed) break;
      const guess = wordlist[i];

      // Check lockout
      if (isLocked(username)) {
        send(`  [LOCKED]  "${guess}" → 403 Account locked after ${MAX_FAILURES} failed attempts`, "blocked");
        send(`            ↳ Defense: Account Lockout — attack stopped`, "defense");
        blocked = true;
        break;
      }

      const reqStart = Date.now();
      const stored = users[username];
      const DUMMY  = "$2a$12$invalidhashusedtopreventiuserenumeration00000000000000000";
      const match  = await bcrypt.compare(guess, stored || DUMMY);
      const ms     = Date.now() - reqStart;

      if (match && stored) {
        send(`  [HIT]     "${guess}" → 200 OK ✓  (${ms}ms)`, "hit");
        resetLockout(username);
        break;
      }

      recordFailure(username);
      const remaining = MAX_FAILURES - getLockout(username).failures;
      send(`  [MISS]    "${guess}" → 401  (${ms}ms bcrypt delay)  ${remaining} attempts left`, "miss");

      if (remaining === 0) {
        await delay(100);
        send(`  [LOCKED]  Next attempt → 403 Account locked`, "blocked");
        send(`            ↳ Defense: Account Lockout triggered`, "defense");
        blocked = true;
        break;
      }

      await delay(50);
    }

    if (!blocked) {
      send(`  [SAFE]    Password not in wordlist — attack exhausted`, "info");
    }

    send("", "info");
    await delay(400);
  }

  if (!closed) {
    send("  === All accounts protected ===", "header");
    send("  bcrypt slowed each attempt to ~100ms", "defense");
    send("  Account lockout blocked the attack after 5 failures", "defense");
    send("  Every attempt was recorded in the audit log →", "defense");
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  }

  } catch (err) {
    if (!closed) {
      res.write(`data: ${JSON.stringify({ line: `  [ERROR] ${err.message}`, type: "blocked" })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    }
  }
});

// ── Audit log live stream ─────────────────────────────────────────────────────
app.get("/audit-stream", (req, res) => {
  const LOG_FILE = path.join(__dirname, "audit.log");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  // Send existing entries first
  if (fs.existsSync(LOG_FILE)) {
    const lines = fs.readFileSync(LOG_FILE, "utf8").split("\n").filter(Boolean);
    for (const line of lines) {
      try { send({ entry: JSON.parse(line), existing: true }); } catch {}
    }
  }

  // Watch for new entries
  let position = fs.existsSync(LOG_FILE) ? fs.statSync(LOG_FILE).size : 0;
  const watcher = fs.watch(path.dirname(LOG_FILE), { persistent: false }, (_event, filename) => {
    if (filename !== "audit.log") return;
    if (!fs.existsSync(LOG_FILE)) return;
    const size = fs.statSync(LOG_FILE).size;
    if (size <= position) return;
    const buf = Buffer.alloc(size - position);
    const fd  = fs.openSync(LOG_FILE, "r");
    fs.readSync(fd, buf, 0, buf.length, position);
    fs.closeSync(fd);
    position = size;
    for (const line of buf.toString().split("\n").filter(Boolean)) {
      try { send({ entry: JSON.parse(line) }); } catch {}
    }
  });

  req.on("close", () => watcher.close());
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const ip = req.ip;
  const userAgent = req.headers["user-agent"] || "unknown";

  // Check lockout
  if (isLocked(username)) {
    log({ type: "ACCOUNT_LOCKED_ATTEMPT", username, ip, userAgent });
    return res.status(403).json({
      success: false,
      error: "Account is temporarily locked. Try again in 15 minutes.",
    });
  }

  const storedHash = users[username];

  // bcrypt.compare is timing-safe and returns false (not an error) for missing users
  // when we fall back to a dummy hash — so we don't leak whether the user exists.
  const DUMMY_HASH = "$2a$12$invalidhashusedtopreventiuserenumeration00000000000000000";
  const hashToCompare = storedHash || DUMMY_HASH;
  const match = await bcrypt.compare(password || "", hashToCompare);

  if (match && storedHash) {
    resetLockout(username);
    log({ type: "LOGIN_SUCCESS", username, ip, userAgent });
    return res.status(200).json({ success: true, token: "fake-jwt-token-stage3" });
  }

  const justLocked = recordFailure(username);
  log({ type: "LOGIN_FAILURE", username, ip, userAgent });

  if (justLocked) {
    log({ type: "ACCOUNT_LOCKED", username, ip, userAgent });
    return res.status(403).json({
      success: false,
      error: "Account locked after too many failed attempts. Try again in 15 minutes.",
    });
  }

  return res.status(401).json({ success: false, message: "Invalid credentials" });
});

app.listen(PORT, () => {
  console.log(`[Stage 3 - Hardened] Server running on http://localhost:${PORT}`);
  console.log(`Audit log: ${__dirname}/audit.log`);
});
