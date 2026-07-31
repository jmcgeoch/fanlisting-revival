const db = require('../db/connection');

const getListingStmt = db.prepare('SELECT * FROM listing LIMIT 1');
const getApprovedMembersStmt = db.prepare(
    "SELECT * FROM member WHERE listing_id = ? AND status = 'approved' ORDER BY country, name",
);
const getRecentApprovedMembersStmt = db.prepare(
    "SELECT * FROM member WHERE listing_id = ? AND status = 'approved' ORDER BY approved_at DESC, id DESC LIMIT ?",
);
// Paginated approved-member list for the public /members page. The country
// filter is optional: when null, the (@country IS NULL) branch matches every
// row, so a single prepared statement covers both "all" and "filtered"
const getApprovedMembersPageStmt = db.prepare(`
  SELECT * FROM member
  WHERE listing_id = @listing_id AND status = 'approved'
    AND (@country IS NULL OR country = @country)
  ORDER BY country, name
  LIMIT @limit OFFSET @offset
`);
const countApprovedMembersStmt = db.prepare(`
  SELECT COUNT(*) AS count FROM member
  WHERE listing_id = @listing_id AND status = 'approved'
    AND (@country IS NULL OR country = @country)
`);
// Distinct countries that actually have approved members — powers the
// /members filter dropdown so it never lists empty options.
const getApprovedCountriesStmt = db.prepare(`
  SELECT DISTINCT country FROM member
  WHERE listing_id = ? AND status = 'approved' AND country IS NOT NULL AND country <> ''
  ORDER BY country
`);
// Footer/home stats in one round-trip: counts plus the most recent approval
// timestamp, which is what a fanlisting shows as "last updated"
const getListingStatsStmt = db.prepare(`
  SELECT
    COUNT(*) FILTER (WHERE status = 'approved') AS approvedCount,
    COUNT(*) FILTER (WHERE status = 'pending')  AS pendingCount,
    MAX(approved_at) FILTER (WHERE status = 'approved') AS lastUpdated
  FROM member WHERE listing_id = ?
`);
const getPendingMembersStmt = db.prepare(
    "SELECT * FROM member WHERE listing_id = ? AND status = 'pending' ORDER BY joined_at",
);
const getAllMembersStmt = db.prepare(
    'SELECT * FROM member WHERE listing_id = ? ORDER BY joined_at DESC',
);
const getMemberByIdStmt = db.prepare('SELECT * FROM member WHERE id = ?');
const getMemberByEmailStmt = db.prepare(
    'SELECT * FROM member WHERE listing_id = ? AND email = ?',
);
const getMemberByEditTokenStmt = db.prepare(
    'SELECT * FROM member WHERE edit_token = ?',
);
const setMemberEditTokenStmt = db.prepare(`
  UPDATE member SET edit_token = @token, edit_token_expires = @expires WHERE id = @id
`);
const clearMemberEditTokenStmt = db.prepare(
    'UPDATE member SET edit_token = NULL, edit_token_expires = NULL WHERE id = ?',
);
// Member self-service update: email stays locked (it's the identity/lookup
// key), so only name/url/country are writable here
const updateMemberDetailsStmt = db.prepare(`
  UPDATE member SET name = @name, url = @url, country = @country WHERE id = @id
`);
const updateListingStmt = db.prepare(`
  UPDATE listing
  SET name = @name, description = @description,
      owner_name = @owner_name, owner_email = @owner_email, owner_url = @owner_url
  WHERE id = @id
`);
const insertMemberStmt = db.prepare(`
  INSERT INTO member (listing_id, name, url, email, country, status)
  VALUES (@listing_id, @name, @url, @email, @country, 'pending')
`);
const setMemberStatusStmt = db.prepare(`
  UPDATE member
  SET status = @status,
      approved_at = CASE WHEN @status = 'approved' THEN CURRENT_TIMESTAMP ELSE approved_at END
  WHERE id = @id
`);
const getAdminByEmailStmt = db.prepare(
    'SELECT * FROM admin_user WHERE email = ?',
);
const insertAdminStmt = db.prepare(
    'INSERT INTO admin_user (email, password_hash) VALUES (?, ?)',
);

module.exports = {
    getListing: () => getListingStmt.get(),
    getApprovedMembers: (listingId) => getApprovedMembersStmt.all(listingId),
    getRecentApprovedMembers: (listingId, limit) =>
        getRecentApprovedMembersStmt.all(listingId, limit),
    getApprovedMembersPage: ({ listingId, country = null, limit, offset }) =>
        getApprovedMembersPageStmt.all({
            listing_id: listingId,
            country,
            limit,
            offset,
        }),
    countApprovedMembers: ({ listingId, country = null }) =>
        countApprovedMembersStmt.get({ listing_id: listingId, country }).count,
    getApprovedCountries: (listingId) =>
        getApprovedCountriesStmt.all(listingId).map((r) => r.country),
    getListingStats: (listingId) => getListingStatsStmt.get(listingId),
    getPendingMembers: (listingId) => getPendingMembersStmt.all(listingId),
    getAllMembers: (listingId) => getAllMembersStmt.all(listingId),
    getMemberById: (id) => getMemberByIdStmt.get(id),
    getMemberByEmail: (listingId, email) =>
        getMemberByEmailStmt.get(listingId, email),
    getMemberByEditToken: (token) => getMemberByEditTokenStmt.get(token),
    setMemberEditToken: ({ id, token, expires }) =>
        setMemberEditTokenStmt.run({ id, token, expires }),
    clearMemberEditToken: (id) => clearMemberEditTokenStmt.run(id),
    updateMemberDetails: (member) => updateMemberDetailsStmt.run(member),
    updateListing: (listing) => updateListingStmt.run(listing),
    insertMember: (member) => insertMemberStmt.run(member),
    approveMember: (id) => setMemberStatusStmt.run({ id, status: 'approved' }),
    rejectMember: (id) => setMemberStatusStmt.run({ id, status: 'rejected' }),
    getAdminByEmail: (email) => getAdminByEmailStmt.get(email),
    insertAdmin: (email, passwordHash) =>
        insertAdminStmt.run(email, passwordHash),
};
