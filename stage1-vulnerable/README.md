# Stage 1 — Vulnerable Login Server

This server intentionally has **zero security protections**. Use it to observe how a brute force attack works unchecked.

## Start the server

```bash
node stage1-vulnerable/server.js
# Server starts on http://localhost:3001
```

## Try it manually

```bash
# Correct credentials
curl -s -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"username":"bob","password":"password123"}'

# Wrong password
curl -s -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"username":"bob","password":"wrongpassword"}'
```

## Run the brute force attack

In a second terminal:

```bash
node attacker/bruteforce.js --target http://localhost:3001/login --username bob
```

## What to observe

- The attacker finds `bob`'s password in seconds
- The server logs show **nothing** — there is no record of the attack
- Requests per second will be very high (hundreds/sec)
- Every attempt gets an immediate response — no throttling whatsoever

## What is wrong with this code

| Problem | Location | Impact |
|---|---|---|
| Plaintext password storage | `users.js` | One leak exposes all passwords immediately |
| No rate limiting | `server.js` — missing middleware | Unlimited attempts per second |
| No account lockout | `server.js` — missing logic | Attack can run forever |
| `===` comparison | `server.js:17` | Not timing-safe; different code paths for "no user" vs "wrong password" |
| No logging | `server.js` — nothing logged | Attacks are completely invisible |

Move to **Stage 2** to see how these problems are fixed.
