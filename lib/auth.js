const crypto = require('crypto');

// Password hashing uses Node's built-in crypto.scrypt rather than an
// external dependency (bcrypt/bcryptjs)

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const check = crypto.scryptSync(password, salt, 64).toString('hex');
    const hashBuf = Buffer.from(hash, 'hex');
    const checkBuf = Buffer.from(check, 'hex');
    if (hashBuf.length !== checkBuf.length) return false;
    return crypto.timingSafeEqual(hashBuf, checkBuf);
}

function requireAdmin(req, res, next) {
    if (req.session && req.session.adminId) return next();
    return res.redirect('/admin/login');
}

module.exports = { hashPassword, verifyPassword, requireAdmin };
