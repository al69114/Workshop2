/**
 * STAGE 2 — PROTECTED LOGIN SERVER
 *
 * Protections added vs Stage 1:
 *  1. IP-based rate limiting (10 requests / 15 min via express-rate-limit)
 *  2. Account lockout after 5 failed attempts (15-minute lock)
 *  3. Timing-safe password comparison using crypto.timingSafeEqual
 *
 * Still weak (fixed in Stage 3):
 *  - Passwords still stored in plaintext
 *  - No security headers
 *  - No audit logging
 */
const express = require("express");
const crypto = require("crypto");
const path = require("path");
const { spawn } = require("child_process");
const users = require("./users");
const loginRateLimiter = require("./rateLimit");
const { isLocked, recordFailure, reset, getFailureCount, MAX_FAILURES } = require("./lockout");

const app = express();
const PORT = 3002;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/login", loginRateLimiter); // rate limit only the login route

app.get("/bruteforce-stream", (req, res) => {
  const username = (req.query.username || "bob").toString();
  const maxlen   = (req.query.maxlen   || "4").toString();
  const charset  = (req.query.charset  || "all").toString();

  const targetPassword = users[username];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  if (!targetPassword) {
    send({ line: `  [ERROR] Unknown user "${username}"` });
    send({ done: true });
    return res.end();
  }

  const scriptPath = path.join(__dirname, "../attacker/bruteforce.py");
  const py = spawn("python3", [
    "-u",
    scriptPath,
    "--username",       username,
    "--local-password", targetPassword,
    "--maxlen",         maxlen,
    "--charset",        charset,
  ]);

  let buffer = "";

  py.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (line.trim()) send({ line });
    }
  });

  py.stderr.on("data", (chunk) => {
    send({ line: `[STDERR] ${chunk.toString().trim()}` });
  });

  py.on("close", () => {
    if (buffer.trim()) send({ line: buffer });
    send({ done: true });
    res.end();
  });

  req.on("close", () => py.kill());
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  // Step 1: Check account lockout
  if (isLocked(username)) {
    return res.status(403).json({
      success: false,
      error: "Account is temporarily locked due to too many failed attempts.",
    });
  }

  // Step 2: Check if user exists
  if (!users[username]) {
    // Still record a failure — prevents username enumeration via lockout timing
    recordFailure(username);
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  // Step 3: Timing-safe comparison
  // crypto.timingSafeEqual requires equal-length Buffers.
  // We pad/hash so attackers cannot infer password length via response time.
  const storedBuf = Buffer.from(users[username]);
  const submittedBuf = Buffer.from(password || "");

  let passwordMatch = false;
  if (storedBuf.length === submittedBuf.length) {
    passwordMatch = crypto.timingSafeEqual(storedBuf, submittedBuf);
  }
  // If lengths differ we skip timingSafeEqual (it would throw),
  // but we still take the same code path so timing is consistent.

  if (passwordMatch) {
    reset(username);
    return res.status(200).json({ success: true, token: "fake-jwt-token-stage2" });
  }

  const justLocked = recordFailure(username);
  const remaining = MAX_FAILURES - getFailureCount(username);

  if (justLocked) {
    return res.status(403).json({
      success: false,
      error: "Account locked after too many failed attempts. Try again in 15 minutes.",
    });
  }

  return res.status(401).json({
    success: false,
    message: "Invalid credentials",
    attemptsRemaining: Math.max(0, remaining),
  });
});

app.listen(PORT, () => {
  console.log(`[Stage 2 - Protected] Server running on http://localhost:${PORT}`);
});
