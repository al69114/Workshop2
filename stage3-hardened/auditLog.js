const fs = require("fs");
const path = require("path");

const LOG_FILE = path.join(__dirname, "audit.log");

/**
 * Write a structured audit event to stdout and audit.log.
 *
 * @param {{ type: string, username: string, ip: string, userAgent?: string }} event
 */
function log(event) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...event,
  });
  console.log(`[Audit] ${entry}`);
  fs.appendFileSync(LOG_FILE, entry + "\n");
}

module.exports = { log };
