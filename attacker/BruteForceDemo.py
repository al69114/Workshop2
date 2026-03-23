import itertools   # Provides tools for creating efficient looping combinations
import string      # Provides useful string constants like lowercase letters
import time        # Lets us measure how long the brute force process takes

def brute_force_demo(target_password: str) -> None:
    # Convert the input password to lowercase and remove extra spaces
    target = target_password.lower().strip()

    # Store all lowercase letters a-z
    letters = string.ascii_lowercase

    # Display a message showing the brute force process is starting
    print(f"Starting brute force on 8-character password...\n")

    # Counter to track how many guesses have been attempted
    attempts = 0

    # Record the start time so elapsed time can be calculated later
    start_time = time.time()

    # Only search 8-character combinations
    for combo in itertools.product(letters, repeat=8):
        # Join the tuple of letters into a single string guess
        guess = ''.join(combo)

        # Increase the attempt counter for each guess
        attempts += 1

        # Every 10,000 attempts, print a progress update
        if attempts % 10000 == 0:
            print(f"Attempt {attempts:,}: trying --> {guess}")

        # Check whether the current guess matches the target password
        if guess == target:
            # Calculate how much time has passed since the search started
            elapsed = time.time() - start_time

            # Print the successful password match and stats
            print(f"\n✅ Password found: '{guess}'")
            print(f"   Attempts: {attempts:,}")
            print(f"   Time: {elapsed:.2f} seconds")
            return  # Stop the function once the password is found

    # If no match is found after trying all combinations, print this message
    print("Password not found.")

if __name__ == "__main__":
    # Ask the user to enter an 8-letter lowercase password
    pwd = input("Enter an 8-letter password (lowercase): ").strip()

    # Print back the password entered and its length for confirmation
    print(f"You entered: '{pwd}' (length: {len(pwd)})")

    # Call the brute force function with the user's password
    brute_force_demo(pwd)