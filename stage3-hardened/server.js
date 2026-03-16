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
const users = require("./users");
const { log } = require("./auditLog");

const app = express();
const PORT = 3003;

// ── Security headers (helmet sets ~11 headers in one call) ──────────────────
app.use(helmet());

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
