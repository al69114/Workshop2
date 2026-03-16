# Stage 3 — Hardened Login Server

The fully hardened version. Same credentials, but now an attacker gets almost nothing useful.

## Start the server

```bash
node stage3-hardened/server.js
# Server starts on http://localhost:3003
# Audit log written to: stage3-hardened/audit.log
```

## Inspect the security headers

```bash
curl -si -X POST http://localhost:3003/login \
  -H "Content-Type: application/json" \
  -d '{"username":"bob","password":"wrong"}' | head -20
```

You will see headers like:
- `Content-Security-Policy` — prevents XSS and data injection
- `X-Frame-Options: SAMEORIGIN` — prevents clickjacking
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `Strict-Transport-Security` — forces HTTPS
- No `X-Powered-By: Express` — server fingerprint removed

## Watch the audit log in real time

```bash
# In a separate terminal:
tail -f stage3-hardened/audit.log
```

## Run the brute force attack

```bash
node attacker/bruteforce.js --target http://localhost:3003/login --username bob
```

Watch the audit log while the attack runs. You will see every attempt logged in real time.

## What to observe

| Stage 1 | Stage 2 | Stage 3 |
|---|---|---|
| Password cracked in seconds | Attack blocked by rate limit / lockout | Attack blocked AND fully logged |
| No record of attack | No record of attack | Every attempt timestamped + IP recorded |
| Requests take < 1ms | Requests take < 1ms | Requests take ~100ms (bcrypt delay) |
| Plaintext passwords in store | Plaintext passwords in store | bcrypt hashes — useless if leaked |

## Why bcrypt matters — offline attacks

Open `stage3-hardened/users.js` and copy `bob`'s hash. Now imagine an attacker steals this file from a breached database. They try to crack it offline:

```
# Offline: ~100ms per attempt at cost 12
# 1 million passwords = 100,000 seconds ≈ 27 hours on a single CPU
# (vs milliseconds for plaintext or MD5/SHA1)
```

Verify a hash yourself in a Node REPL:
```js
const bcrypt = require('bcryptjs');
await bcrypt.compare('password123', '<paste bob hash here>'); // → true
await bcrypt.compare('wrongpassword', '<paste bob hash here>'); // → false
```

## Challenges

**1. Read the audit log** — After an attack run, how many `LOGIN_FAILURE` events are there? What IP did the attacker use?

**2. Increase the cost factor** — In `users.js`, regenerate hashes with cost 14 instead of 12. How does response time change? Run `npm run stage3` again and time a login request.

**3. Add TOTP** — Add a third login field `totp_code` and validate it against a shared secret. Even if an attacker guesses the password, they are stopped without the OTP.

**4. Argon2 vs bcrypt** — Replace `bcryptjs` with `argon2`. Argon2id is the current OWASP recommendation. Compare the response time and hash format.
