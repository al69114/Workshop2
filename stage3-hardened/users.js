/**
 * User store with bcrypt-hashed passwords (cost factor 12).
 *
 * To regenerate these hashes in a Node REPL:
 *   const bcrypt = require('bcryptjs');
 *   console.log(await bcrypt.hash('password123', 12));
 *
 * Notice: even if this file is leaked, the attacker cannot log in directly.
 * They would need to run an offline dictionary attack against each hash —
 * which bcrypt's cost factor makes computationally expensive (~100ms per attempt).
 */
const users = {
  alice: "$2a$12$fzBN7CNjyIxHfBaLPnFybu8c28WdJxYupxJETZDvfek8mL7olfs0W",
  // password: sunshine99

  bob: "$2a$12$Uq4Tn.fVstJPQNSl.X5dKukLSCTHWSa7Z9KNpLcCG6XKETeolS60.",
  // password: password123  (in the wordlist — but bcrypt slows the cracker way down)

  carol: "$2a$12$qMRV2eQRRPMu3H5JpKIaJOUmC16N9ZnE4ln.78Ui/9Kd/u6hm7QdO",
  // password: c@r0l2024

  dave: "$2a$12$dFoBsQ7Hw0.iExk6WGTshuAzGafakz2qWMwv5KmtGABNZGY1IsmfG",
  // password: qwerty
};

module.exports = users;
