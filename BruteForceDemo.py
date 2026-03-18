import itertools
import string
import time

def brute_force_demo(target_password: str) -> None:
    target = target_password.lower().strip()

    letters = string.ascii_lowercase

    print(f"Starting brute force on 8-character password...\n")

    attempts = 0
    start_time = time.time()

    # Only search 8-character combinations
    for combo in itertools.product(letters, repeat=8):
        guess = ''.join(combo)
        attempts += 1

        if attempts % 10000 == 0:
            print(f"Attempt {attempts:,}: trying --> {guess}")

        if guess == target:
            elapsed = time.time() - start_time
            print(f"\n✅ Password found: '{guess}'")
            print(f"   Attempts: {attempts:,}")
            print(f"   Time: {elapsed:.2f} seconds")
            return

    print("Password not found.")

if __name__ == "__main__":
    pwd = input("Enter an 8-letter password (lowercase): ").strip()
    print(f"You entered: '{pwd}' (length: {len(pwd)})")
    brute_force_demo(pwd)