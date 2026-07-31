const { test, after } = require('node:test');
const assert = require('node:assert');
const { queries, listing, seedMember, cleanup } = require('./helpers');

after(cleanup);

test('getListingStats counts approved/pending and reports last update', () => {
    const id = listing().id;
    seedMember({ status: 'approved', country: 'Canada' });
    seedMember({ status: 'approved', country: 'Japan' });
    seedMember({ status: 'pending' });

    const stats = queries.getListingStats(id);
    assert.strictEqual(stats.approvedCount, 2);
    assert.strictEqual(stats.pendingCount, 1);
    assert.ok(
        stats.lastUpdated,
        'lastUpdated should be set once a member is approved',
    );
});

test('getApprovedCountries returns distinct countries with approved members', () => {
    const id = listing().id;
    const countries = queries.getApprovedCountries(id);
    // From the seeds above: Canada + Japan (the pending member is excluded).
    assert.deepStrictEqual([...countries].sort(), ['Canada', 'Japan']);
});

test('getApprovedMembersPage paginates and filters by country', () => {
    const id = listing().id;
    // Two more approved Canadians -> 3 Canada, 1 Japan total.
    seedMember({ status: 'approved', country: 'Canada' });
    seedMember({ status: 'approved', country: 'Canada' });

    const all = queries.countApprovedMembers({ listingId: id });
    assert.strictEqual(all, 4);

    const canada = queries.countApprovedMembers({
        listingId: id,
        country: 'Canada',
    });
    assert.strictEqual(canada, 3);

    const firstTwo = queries.getApprovedMembersPage({
        listingId: id,
        country: 'Canada',
        limit: 2,
        offset: 0,
    });
    assert.strictEqual(firstTwo.length, 2);

    const lastOne = queries.getApprovedMembersPage({
        listingId: id,
        country: 'Canada',
        limit: 2,
        offset: 2,
    });
    assert.strictEqual(lastOne.length, 1);
});
