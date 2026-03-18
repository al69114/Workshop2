/**
 * STAGE 1 — VULNERABLE LOGIN SERVER
 *
 * Problems demonstrated here:
 *  1. Passwords stored in plaintext
 *  2. No rate limiting — unlimited login attempts
 *  3. No account lockout
 *  4. Uses === comparison (not timing-safe, leaks timing info)
 *  5. No logging — attacks are invisible
 */
const express = require("express");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const users = require("./users");

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const WORDLIST = fs
  .readFileSync(path.join(__dirname, "../attacker/wordlist.txt"), "utf8")
  .split("\n")
  .map((p) => p.trim())
  .filter(Boolean);

app.get("/attack-stream", async (req, res) => {
  const username = (req.query.username || "bob").toString();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  for (const password of WORDLIST) {
    const isHit = users[username] && users[username] === password;
    send({ password, result: isHit ? "hit" : "miss" });
    // Small delay so the browser can render each line
    await new Promise((r) => setTimeout(r, 30));
    if (isHit) {
      send({ done: true, found: true });
      return res.end();
    }
  }

  send({ done: true, found: false });
  res.end();
});

app.get("/bruteforce-stream", (req, res) => {
  const username = (req.query.username || "eve").toString();
  const maxlen   = (req.query.maxlen   || "3").toString();
  const charset  = (req.query.charset  || "all").toString();

  // Resolve the target password so Python can crack it locally (CPU speed)
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
    buffer = lines.pop(); // keep incomplete last line
    for (const line of lines) {
      if (line.trim()) send({ line: line });
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

  // Kill the Python process if the browser disconnects
  req.on("close", () => py.kill());
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  // Vulnerability 1: user not found vs wrong password take slightly
  // different code paths — timing side-channel exists.
  if (!users[username]) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  // Vulnerability 2: === is not timing-safe
  if (users[username] === password) {
    return res.status(200).json({ success: true, token: "fake-jwt-token-stage1" });
  }

  return res.status(401).json({ success: false, message: "Invalid credentials" });
});

app.listen(PORT, () => {
  console.log(`[Stage 1 - Vulnerable] Server running on http://localhost:${PORT}`);
  console.log("WARNING: This server has NO protections. For workshop use only.");
});
