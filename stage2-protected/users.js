// Mix of 4-char and long passwords.
// 4-char passwords get found by brute force but take longer than Stage 1's 3-char ones.
// Long passwords demonstrate that length defeats brute force.
const users = {
  alice: "aA1!",        // 4 chars — crackable, takes a few seconds
  bob:   "bB2@",        // 4 chars — crackable, takes a bit longer
  carol: "c@r0l2024",  // 9 chars — brute force won't find this in demo time
  dave:  "dD4#",        // 4 chars — crackable
  eve:   "sunshine99",  // 9 chars — brute force won't find this in demo time
};

module.exports = users;
