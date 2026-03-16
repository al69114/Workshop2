// In-memory account lockout tracker.
// In production, this would live in Redis so it survives restarts and
// works across multiple server instances.

const MAX_FAILURES = 5;              // lock after this many bad attempts
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Map<username, { failedAttempts: number, lockedUntil: Date|null }>
const store = new Map();

function getEntry(username) {
  if (!store.has(username)) {
    store.set(username, { failedAttempts: 0, lockedUntil: null });
  }
  return store.get(username);
}

/**
 * Returns true if the account is currently locked.
 */
function isLocked(username) {
  const entry = getEntry(username);
  if (!entry.lockedUntil) return false;
  if (Date.now() < entry.lockedUntil) return true;
  // Lock has expired — reset automatically
  entry.lockedUntil = null;
  entry.failedAttempts = 0;
  return false;
}

/**
 * Record a failed login attempt. Triggers lockout after MAX_FAILURES.
 * Returns true if this failure triggered a new lockout.
 */
function recordFailure(username) {
  const entry = getEntry(username);
  entry.failedAttempts += 1;
  if (entry.failedAttempts >= MAX_FAILURES) {
    entry.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    console.log(`[Lockout] Account "${username}" locked until ${new Date(entry.lockedUntil).toISOString()}`);
    return true; // lockout triggered
  }
  return false;
}

/**
 * Reset failure count after a successful login.
 */
function reset(username) {
  store.set(username, { failedAttempts: 0, lockedUntil: null });
}

/**
 * Get current failure count (useful for debugging / showing students state).
 */
function getFailureCount(username) {
  return getEntry(username).failedAttempts;
}

module.exports = { isLocked, recordFailure, reset, getFailureCount, MAX_FAILURES };
