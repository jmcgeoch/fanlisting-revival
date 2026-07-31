const rateLimit = require('express-rate-limit');
const config = require('../config');

// Disable rate limiting under the test runner so integration tests (which fire
// many requests from a single IP) stay deterministic. The limits are exercised
// manually / in production
const skip = () => config.nodeEnv === 'test';

// Brute-force protection for the admin login form.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skip,
    message: 'Too many login attempts. Please try again in a few minutes.',
});

// Throttle the public endpoints that trigger outgoing email, so they can't be
// used to spam a member's inbox or blast the owner with notifications
const emailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    skip,
    message: 'Too many requests. Please try again in a few minutes.',
});

module.exports = { loginLimiter, emailLimiter };
