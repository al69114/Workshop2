import itertools
import string
import time

# Function that tries to brute-force an 8-letter lowercase password
def brute_force_demo(target_password: str) -> None:
    # Convert the target password to lowercase and remove extra spaces
    target = target_password.lower().strip()

    # Store all lowercase letters a-z
    letters = string.ascii_lowercase

    # Print starting message
    print(f"Starting brute force on 8-character password...\n")

    # Count how many guesses have been tried
    attempts = 0

    # Record the time when the brute force starts
    start_time = time.time()

    # Only search 8-character combinations
    for combo in itertools.product(letters, repeat=8):
        # Join tuple of letters into a single string guess
        guess = ''.join(combo)

        # Increase attempt counter
        attempts += 1

        # Print progress every 10,000 attempts
        if attempts % 10000 == 0:
            print(f"Attempt {attempts:,}: trying --> {guess}")

        # Check if the current guess matches the target password
        if guess == target:
            # Calculate total time taken
            elapsed = time.time() - start_time

            # Print success message
            print(f"\n✅ Password found: '{guess}'")
            print(f"   Attempts: {attempts:,}")
            print(f"   Time: {elapsed:.2f} seconds")
            return

    # Print this if no password match is found
    print("Password not found.")

# Run this block only if the script is executed directly
if __name__ == "__main__":
    # Ask the user to enter an 8-letter lowercase password
    pwd = input("Enter an 8-letter password (lowercase): ").strip()

    # Print what the user entered and its length
    print(f"You entered: '{pwd}' (length: {len(pwd)})")

    # Call the brute force function with the user’s password
    brute_force_demo(pwd)