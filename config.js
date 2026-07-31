require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

// The session secret signs admin login cookies. A known/default value would
// let anyone forge an admin session, so refuse to boot in production without
// a real one. In development we allow a fixed fallback for convenience.
let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
    if (isProduction) {
        throw new Error(
            'SESSION_SECRET must be set to a long random string in production.',
        );
    }
    sessionSecret = 'dev-secret-change-me';
}

// Absolute base URL used when building links inside emails (magic-link edit
// URL, button embed codes). Set this in production: relying on the request's
// Host header lets an attacker point emailed links at their own domain.
const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
if (isProduction && !appUrl) {
    throw new Error(
        'APP_URL must be set in production (e.g. https://fans.example.com).',
    );
}

module.exports = {
    nodeEnv,
    isProduction,
    port: process.env.PORT || 3000,
    sessionSecret,
    appUrl,
    dbPath: process.env.DB_PATH || './data/fanlisting.db',
    ownerEmail: process.env.OWNER_EMAIL || '',
    mail: {
        host: process.env.SMTP_HOST || '',
        port: Number(process.env.SMTP_PORT) || 587,
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.MAIL_FROM || 'Fanlisting <no-reply@example.com>',
    },
};
