// In-memory user store with PLAINTEXT passwords.
// NEVER do this in production — this is intentionally insecure for the workshop.
const users = {
  alice: "sunshine99",
  bob: "password123",   // weak password — this is in the wordlist!
  carol: "c@r0l2024",
  dave: "qwerty",       // also in the wordlist
};

module.exports = users;
