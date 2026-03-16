# Stage 2 — Protected Login Server

Same credentials as Stage 1, but now the server fights back.

## Start the server

```bash
node stage2-protected/server.js
# Server starts on http://localhost:3002
```

## Protections added

| Protection | File | How it works |
|---|---|---|
| IP rate limiting | `rateLimit.js` | Max 10 requests per IP per 15 minutes. Returns HTTP 429 on breach. |
| Account lockout | `lockout.js` | 5 failed attempts → account locked for 15 minutes. Returns HTTP 403. |
| Timing-safe compare | `server.js` | Uses `crypto.timingSafeEqual` to prevent timing attacks |

## Run the brute force attack

```bash
node attacker/bruteforce.js --target http://localhost:3002/login --username bob
```

## What to observe

- After 10 requests, the IP hits the **rate limit** (HTTP 429 responses)
- After 5 failed attempts for `bob`, the **account locks** (HTTP 403 responses)
- The correct password is never reached — `bob` is locked out after entry #5

## Challenges

**1. Rate limit bypass** — Can a slow attacker avoid the rate limit?
```bash
node attacker/bruteforce.js --target http://localhost:3002/login --username bob --delay 5000
```
The rate limit allows 10 per 15 minutes. At 5-second delay = 12 requests/minute. What happens?

**2. Tune the thresholds** — Open `rateLimit.js` and `lockout.js`. Change `MAX_REQUESTS` to 100 or `MAX_FAILURES` to 20. Restart and re-run the attack. How does the attacker's success rate change?

**3. Multi-IP attack** — IP rate limiting can be bypassed with multiple IPs (botnets, proxies). This is why account lockout is a critical second layer.

## Still missing (see Stage 3)

- Passwords still stored in plaintext — a database leak would expose everything
- No security headers on responses
- No audit log — we improved things, but attacks are still invisible in logs
