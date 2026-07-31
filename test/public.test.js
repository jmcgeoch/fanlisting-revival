const { test, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const {
    app,
    queries,
    listing,
    seedMember,
    getCsrf,
    cleanup,
} = require('./helpers');

after(cleanup);

test('public pages render', async () => {
    for (const path of ['/', '/members', '/join', '/update', '/buttons']) {
        const res = await request(app).get(path);
        assert.strictEqual(res.status, 200, `${path} should return 200`);
    }
});

test('POST /join without a CSRF token is rejected', async () => {
    const res = await request(app)
        .post('/join')
        .type('form')
        .send({ name: 'X', email: 'x@example.com', country: 'Canada' });
    assert.strictEqual(res.status, 403);
});

test('POST /join rejects invalid input with 400 and does not insert', async () => {
    const before = queries.getListingStats(listing().id).pendingCount;
    const agent = request.agent(app);
    const token = await getCsrf(agent, '/join');

    const res = await agent.post('/join').type('form').send({
        _csrf: token,
        name: '',
        email: 'not-an-email',
        country: 'Nowhere',
    });

    assert.strictEqual(res.status, 400);
    const after = queries.getListingStats(listing().id).pendingCount;
    assert.strictEqual(
        after,
        before,
        'no member should be inserted on invalid input',
    );
});

test('POST /join with valid input inserts a pending member', async () => {
    const agent = request.agent(app);
    const token = await getCsrf(agent, '/join');

    const res = await agent.post('/join').type('form').send({
        _csrf: token,
        name: 'Valid Joiner',
        email: 'valid@example.com',
        url: 'https://example.com',
        country: 'Canada',
    });

    assert.strictEqual(res.status, 200);
    const member = queries.getMemberByEmail(listing().id, 'valid@example.com');
    assert.ok(member, 'member row should exist');
    assert.strictEqual(member.status, 'pending');
});

test('/members filters by country and ignores unknown values', async () => {
    seedMember({ status: 'approved', name: 'Cana Dian', country: 'Canada' });
    seedMember({ status: 'approved', name: 'Nihon Jin', country: 'Japan' });

    const filtered = await request(app).get('/members?country=Japan');
    assert.match(filtered.text, /Nihon Jin/);
    assert.doesNotMatch(filtered.text, /Cana Dian/);

    // An unknown country falls back to showing everyone (no injection / no error).
    const bogus = await request(app).get('/members?country=Atlantis');
    assert.strictEqual(bogus.status, 200);
    assert.match(bogus.text, /Nihon Jin/);
    assert.match(bogus.text, /Cana Dian/);
});
