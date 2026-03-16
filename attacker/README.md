# Attacker — Brute Force Script

This script sends sequential login requests using a dictionary wordlist. Use it against each stage to observe how defenses behave.

## Usage

```bash
node attacker/bruteforce.js [options]

Options:
  --target <url>       Login endpoint  (default: http://localhost:3001/login)
  --username <name>    Username to attack  (default: bob)
  --wordlist <file>    Path to wordlist  (default: attacker/wordlist.txt)
  --delay <ms>         Milliseconds between requests  (default: 0)
  --stop-on-block      Exit on first 429 or 403 response
```

## Against each stage

```bash
# Stage 1 — no defenses, password found immediately
node attacker/bruteforce.js --target http://localhost:3001/login

# Stage 2 — rate limited + account lockout
node attacker/bruteforce.js --target http://localhost:3002/login

# Stage 3 — hardened, plus watch audit.log in another terminal
node attacker/bruteforce.js --target http://localhost:3003/login
```

## Output legend

| Color | Meaning |
|---|---|
| Green | 200 — password found! |
| Red | 401 — wrong password |
| Yellow | 429 — IP rate limited |
| Magenta | 403 — account locked |
| Gray | Other / error |

## Challenges

**Slow attack to bypass rate limiting:**
```bash
# 10 requests per 15 min window = 1 per 90 seconds. Try 100s delay:
node attacker/bruteforce.js --target http://localhost:3002/login --delay 100000
```
Observe: the rate limiter is bypassed, but the account lockout still stops the attack after 5 failures.

**Stop on first block:**
```bash
node attacker/bruteforce.js --target http://localhost:3002/login --stop-on-block
```

**Try a different username:**
```bash
node attacker/bruteforce.js --target http://localhost:3001/login --username dave
```
`dave`'s password is also in the wordlist. How far down is it?
