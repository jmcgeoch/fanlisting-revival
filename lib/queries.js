const db = require('../db/connection');

const getListingStmt = db.prepare('SELECT * FROM listing LIMIT 1');
const getApprovedMembersStmt = db.prepare(
  "SELECT * FROM member WHERE listing_id = ? AND status = 'approved' ORDER BY country, name"
);
const getPendingMembersStmt = db.prepare(
  "SELECT * FROM member WHERE listing_id = ? AND status = 'pending' ORDER BY joined_at"
);
const getAllMembersStmt = db.prepare(
  'SELECT * FROM member WHERE listing_id = ? ORDER BY joined_at DESC'
);
const getMemberByIdStmt = db.prepare('SELECT * FROM member WHERE id = ?');
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
const getAdminByEmailStmt = db.prepare('SELECT * FROM admin_user WHERE email = ?');
const countAdminsStmt = db.prepare('SELECT COUNT(*) AS count FROM admin_user');
const insertAdminStmt = db.prepare(
  'INSERT INTO admin_user (email, password_hash) VALUES (?, ?)'
);

module.exports = {
  getListing: () => getListingStmt.get(),
  getApprovedMembers: (listingId) => getApprovedMembersStmt.all(listingId),
  getPendingMembers: (listingId) => getPendingMembersStmt.all(listingId),
  getAllMembers: (listingId) => getAllMembersStmt.all(listingId),
  getMemberById: (id) => getMemberByIdStmt.get(id),
  insertMember: (member) => insertMemberStmt.run(member),
  approveMember: (id) => setMemberStatusStmt.run({ id, status: 'approved' }),
  rejectMember: (id) => setMemberStatusStmt.run({ id, status: 'rejected' }),
  getAdminByEmail: (email) => getAdminByEmailStmt.get(email),
  countAdmins: () => countAdminsStmt.get().count,
  insertAdmin: (email, passwordHash) => insertAdminStmt.run(email, passwordHash),
};
