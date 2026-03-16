const rateLimit = require("express-rate-limit");

// Allow a maximum of 10 login attempts per IP per 15-minute window.
// Tune WINDOW_MS and MAX_REQUESTS to experiment with different thresholds.
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 10;

const loginRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQUESTS,
  standardHeaders: true,   // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,
  message: {
    error: "Too many login attempts from this IP. Try again in 15 minutes.",
  },
});

module.exports = loginRateLimiter;
