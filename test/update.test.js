const { test, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app, queries, seedMember, getCsrf, cleanup } = require('./helpers');

after(cleanup);

// Drive the full magic-link flow: request a link, load the token form, save,
// and confirm the token is single-use.
test('approved member can update details via magic link', async () => {
    const member = seedMember({
        status: 'approved',
        name: 'Old Name',
        email: 'editme@example.com',
        country: 'Canada',
    });

    // 1. Request a link.
    const reqAgent = request.agent(app);
    const reqToken = await getCsrf(reqAgent, '/update');
    const sent = await reqAgent
        .post('/update')
        .type('form')
        .send({ _csrf: reqToken, email: 'editme@example.com' });
    assert.strictEqual(sent.status, 200);

    // The one-time token is now stored on the member row.
    const withToken = queries.getMemberById(member.id);
    assert.ok(withToken.edit_token, 'edit_token should be set');
    const token = withToken.edit_token;

    // 2. The token form loads, pre-filled.
    const formAgent = request.agent(app);
    const form = await formAgent.get(`/update/${token}`);
    assert.strictEqual(form.status, 200);
    assert.match(form.text, /Old Name/);
    assert.match(form.text, /editme@example.com/); // email shown but locked

    // 3. Save changes.
    const csrf = /name="_csrf" value="([^"]+)"/.exec(form.text)[1];
    const saved = await formAgent
        .post(`/update/${token}`)
        .type('form')
        .send({ _csrf: csrf, name: 'New Name', url: '', country: 'Japan' });
    assert.strictEqual(saved.status, 200);

    const updated = queries.getMemberById(member.id);
    assert.strictEqual(updated.name, 'New Name');
    assert.strictEqual(updated.country, 'Japan');
    assert.strictEqual(
        updated.email,
        'editme@example.com',
        'email must stay locked',
    );
    assert.strictEqual(
        updated.edit_token,
        null,
        'token should be cleared after use',
    );

    // 4. The used token no longer works.
    const reuse = await request(app).get(`/update/${token}`);
    assert.strictEqual(reuse.status, 400);
});

test('unknown update token returns 400', async () => {
    const res = await request(app).get('/update/deadbeefdeadbeef');
    assert.strictEqual(res.status, 400);
});

test('requesting a link for a non-member still returns 200 (no enumeration)', async () => {
    const agent = request.agent(app);
    const token = await getCsrf(agent, '/update');
    const res = await agent
        .post('/update')
        .type('form')
        .send({ _csrf: token, email: 'nobody@example.com' });
    assert.strictEqual(res.status, 200);
});
