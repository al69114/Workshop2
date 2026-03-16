# Workshop: Brute Force Attacks & Password Security

A hands-on workshop demonstrating how brute force attacks work and what defenses stop them. You will run a real attack script against three versions of the same login server — each with progressively stronger protections.

## Learning objectives

- Understand how dictionary / brute force attacks work in practice
- See first-hand why rate limiting and account lockout are necessary
- Understand why passwords must be hashed (not stored in plaintext)
- Learn what timing-safe comparison is and why it matters
- Know what security headers protect against

## Prerequisites

- Node.js 18+ installed
- Two terminal windows (one for the server, one for the attacker)

## Setup

```bash
npm install
```

## Workshop flow

### Stage 1 — No defenses (15 min)

```bash
# Terminal 1: start the server
npm run stage1

# Terminal 2: run the attack
npm run attack -- --target http://localhost:3001/login
```

Watch the attacker find `bob`'s password (`password123`) in seconds. The server logs show nothing.

→ See [stage1-vulnerable/README.md](stage1-vulnerable/README.md) for details.

---

### Stage 2 — Rate limiting + account lockout (20 min)

```bash
npm run stage2
npm run attack -- --target http://localhost:3002/login
```

The attack is stopped before the correct password is reached.

→ See [stage2-protected/README.md](stage2-protected/README.md) for details.

---

### Stage 3 — Fully hardened (20 min)

```bash
# Terminal 1: start server
npm run stage3

# Terminal 2: watch the audit log live
tail -f stage3-hardened/audit.log

# Terminal 3: run the attack
npm run attack -- --target http://localhost:3003/login
```

Watch every attack attempt appear in the audit log in real time. Note the response latency (~100ms per request vs <1ms in Stage 1) — that is bcrypt's cost factor slowing down any offline cracking too.

→ See [stage3-hardened/README.md](stage3-hardened/README.md) for details.

---

## Security comparison

| Feature | Stage 1 | Stage 2 | Stage 3 |
|---|:---:|:---:|:---:|
| Password storage | Plaintext | Plaintext | bcrypt hash |
| Rate limiting | ✗ | ✓ | ✓ |
| Account lockout | ✗ | ✓ | ✓ |
| Timing-safe compare | ✗ | ✓ | ✓ (bcrypt built-in) |
| Security headers | ✗ | ✗ | ✓ (helmet) |
| Audit logging | ✗ | ✗ | ✓ |
| User enumeration protection | ✗ | Partial | ✓ (dummy hash) |

## Project structure

```
Workshop2/
├── stage1-vulnerable/    # No protections
│   ├── server.js
│   └── users.js          # Plaintext passwords
├── stage2-protected/     # Rate limit + lockout + timing-safe compare
│   ├── server.js
│   ├── rateLimit.js
│   ├── lockout.js
│   └── users.js
├── stage3-hardened/      # bcrypt + helmet + audit log
│   ├── server.js
│   ├── users.js          # bcrypt hashes
│   └── auditLog.js
└── attacker/
    ├── bruteforce.js     # Attack script
    └── wordlist.txt      # ~120 common passwords
```

## Key concepts

**Dictionary attack** — trying passwords from a list of common/leaked passwords rather than every possible combination.

**Rate limiting** — capping the number of requests per IP per time window, making automated attacks slow or infeasible.

**Account lockout** — temporarily disabling an account after N failed attempts. Stops attacks that rotate IPs to bypass rate limiting.

**Timing-safe comparison** — comparing strings in constant time so attackers cannot infer correctness from response latency.

**bcrypt** — a password hashing algorithm with a configurable cost factor. Higher cost = more computation per attempt, making offline cracking expensive. Also salts automatically (no rainbow table attacks).

**Security headers** — HTTP response headers that instruct browsers to enforce security policies (CSP, HSTS, X-Frame-Options, etc.).

**Audit logging** — recording every authentication event (success, failure, lockout) with timestamp and IP, enabling incident detection and forensics.
