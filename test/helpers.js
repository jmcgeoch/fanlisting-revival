// Shared test setup. Must run BEFORE the app is required so the singleton DB
// connection (opened at require-time from DB_PATH) points at an isolated temp
// file. `node --test` runs each test file in its own process, so each file
// gets its own fresh database.
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(
    os.tmpdir(),
    `fl-test-${crypto.randomBytes(6).toString('hex')}.db`,
);

process.env.NODE_ENV = 'test';
process.env.DB_PATH = dbPath;
process.env.SESSION_SECRET = 'test-secret';
process.env.SMTP_HOST = ''; // console mailer — never sends real email
delete process.env.APP_URL;

const app = require('../server');
const queries = require('../lib/queries');
const { hashPassword } = require('../lib/auth');

// The 001 migration seeds exactly one listing row.
const listing = () => queries.getListing();

function seedAdmin(email = 'admin@test.com', password = 'password123') {
    queries.insertAdmin(email, hashPassword(password));
    return { email, password };
}

function seedMember(overrides = {}) {
    const { status, ...rest } = overrides;
    const info = queries.insertMember({
        listing_id: listing().id,
        name: 'Test Member',
        email: `member-${crypto.randomBytes(4).toString('hex')}@test.com`,
        url: null,
        country: 'Canada',
        ...rest,
    });
    const id = info.lastInsertRowid;
    if (status === 'approved') queries.approveMember(id);
    if (status === 'rejected') queries.rejectMember(id);
    return queries.getMemberById(id);
}

// Pull the CSRF token out of a rendered form so a follow-up POST (on the same
// agent, sharing the session cookie) passes CSRF validation.
async function getCsrf(agent, urlPath) {
    const res = await agent.get(urlPath);
    const match = /name="_csrf" value="([^"]+)"/.exec(res.text);
    return match ? match[1] : null;
}

function cleanup() {
    for (const suffix of ['', '-wal', '-shm']) {
        try {
            fs.unlinkSync(dbPath + suffix);
        } catch {
            /* already gone */
        }
    }
}

module.exports = {
    app,
    queries,
    listing,
    seedAdmin,
    seedMember,
    getCsrf,
    cleanup,
};
