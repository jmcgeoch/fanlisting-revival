const { test, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const {
    app,
    queries,
    listing,
    seedAdmin,
    seedMember,
    getCsrf,
    cleanup,
} = require('./helpers');

after(cleanup);

const admin = seedAdmin();

// Log an agent in and return it (session cookie retained by the agent).
async function loginAgent() {
    const agent = request.agent(app);
    const token = await getCsrf(agent, '/admin/login');
    await agent
        .post('/admin/login')
        .type('form')
        .send({ _csrf: token, email: admin.email, password: admin.password });
    return agent;
}

test('admin area requires login', async () => {
    const res = await request(app).get('/admin').redirects(0);
    assert.strictEqual(res.status, 302);
    assert.match(res.headers.location, /\/admin\/login/);
});

test('login rejects bad credentials', async () => {
    const agent = request.agent(app);
    const token = await getCsrf(agent, '/admin/login');
    const res = await agent
        .post('/admin/login')
        .type('form')
        .send({ _csrf: token, email: admin.email, password: 'wrongpassword' });
    assert.strictEqual(res.status, 401);
});

test('login succeeds and grants access to the dashboard', async () => {
    const agent = await loginAgent();
    const res = await agent.get('/admin');
    assert.strictEqual(res.status, 200);
    assert.match(res.text, /Admin/);
});

test('admin can approve a pending member', async () => {
    const member = seedMember({ status: 'pending', name: 'Pending Pat' });
    const agent = await loginAgent();
    const token = await getCsrf(agent, '/admin/members');

    const res = await agent
        .post(`/admin/members/${member.id}/approve`)
        .type('form')
        .send({ _csrf: token })
        .redirects(0);
    assert.strictEqual(res.status, 302);
    assert.strictEqual(queries.getMemberById(member.id).status, 'approved');
});

test('bulk approve only transitions non-approved members', async () => {
    const pending = seedMember({ status: 'pending' });
    const already = seedMember({ status: 'approved' });
    const approvedAtBefore = queries.getMemberById(already.id).approved_at;

    const agent = await loginAgent();
    const token = await getCsrf(agent, '/admin/members');
    const res = await agent
        .post('/admin/members/bulk')
        .type('form')
        .send({
            _csrf: token,
            action: 'approve',
            ids: [pending.id, already.id],
        })
        .redirects(0);

    assert.strictEqual(res.status, 302);
    assert.strictEqual(queries.getMemberById(pending.id).status, 'approved');
    // The already-approved member's approved_at must not be re-stamped.
    assert.strictEqual(
        queries.getMemberById(already.id).approved_at,
        approvedAtBefore,
    );
});

test('settings rejects an invalid owner URL', async () => {
    const agent = await loginAgent();
    const token = await getCsrf(agent, '/admin/settings');

    await agent
        .post('/admin/settings')
        .type('form')
        .send({
            _csrf: token,
            name: 'My Listing',
            owner_url: 'javascript:alert(1)',
        })
        .redirects(0);

    assert.strictEqual(
        listing().owner_url,
        null,
        'a javascript: URL must not be saved',
    );
});

test('settings saves valid owner details', async () => {
    const agent = await loginAgent();
    const token = await getCsrf(agent, '/admin/settings');

    await agent
        .post('/admin/settings')
        .type('form')
        .send({
            _csrf: token,
            name: 'My Listing',
            owner_name: 'Owner',
            owner_email: 'owner@example.com',
            owner_url: 'https://example.com',
        })
        .redirects(0);

    const saved = listing();
    assert.strictEqual(saved.owner_name, 'Owner');
    assert.strictEqual(saved.owner_email, 'owner@example.com');
    assert.strictEqual(saved.owner_url, 'https://example.com');
});
