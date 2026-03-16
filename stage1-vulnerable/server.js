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
const users = require("./users");

const app = express();
const PORT = 3001;

app.use(express.json());

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
