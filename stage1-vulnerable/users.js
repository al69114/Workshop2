// In-memory user store with PLAINTEXT passwords.
// NEVER do this in production — this is intentionally insecure for the workshop.
const users = {
  alice: "A1!",   // uppercase + digit + symbol
  bob:   "bB2",   // lower + upper + digit
  carol: "c@C",   // lower + symbol + upper
  dave:  "d4#",   // lower + digit + symbol
  eve:   "E5$",   // upper + digit + symbol
};

module.exports = users;
