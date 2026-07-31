const express = require('express');
const validator = require('validator');
const queries = require('../lib/queries');
const { verifyPassword, requireAdmin } = require('../lib/auth');
const { flash } = require('../lib/flash');
const { sendTemplateEmail } = require('../lib/mailer');
const { loginLimiter } = require('../lib/ratelimit');

const router = express.Router();

// Approve a member and send the approval email — but only if they aren't
// already approved, so re-running an approve (individually or in a bulk action
// that includes approved rows) can't re-email them or re-stamp approved_at.
// Returns true if the member actually transitioned.
function approveAndNotify(member) {
    if (!member || member.status === 'approved') return false;
    queries.approveMember(member.id);
    sendTemplateEmail(
        member.email,
        "You're approved for {{listingName}}!",
        'approved',
        {
            name: member.name,
            listingName: queries.getListing().name,
        },
    ).catch((err) => console.error('Failed to send approval email:', err));
    return true;
}

router.get('/login', (req, res) => {
    if (req.session.adminId) return res.redirect('/admin');
    res.render('admin/login', { error: null, layout: 'main' });
});

router.post('/login', loginLimiter, (req, res) => {
    const { email, password } = req.body;
    const admin = queries.getAdminByEmail((email || '').trim().toLowerCase());
    if (!admin || !verifyPassword(password || '', admin.password_hash)) {
        return res
            .status(401)
            .render('admin/login', { error: 'Invalid email or password.' });
    }
    req.session.adminId = admin.id;
    res.redirect('/admin');
});

router.post('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/admin/login'));
});

router.use(requireAdmin);

router.get('/', (req, res) => {
    const listing = queries.getListing();
    const pending = queries.getPendingMembers(listing.id);
    const all = queries.getAllMembers(listing.id);
    res.render('admin/dashboard', {
        listing,
        pendingCount: pending.length,
        approvedCount: all.filter((m) => m.status === 'approved').length,
        recent: all.slice(0, 5),
    });
});

router.get('/settings', (req, res) => {
    res.render('admin/settings', { listing: queries.getListing() });
});

router.post('/settings', (req, res) => {
    const listing = queries.getListing();
    const { name, description, owner_name, owner_email, owner_url } = req.body;

    const email = (owner_email || '').trim();
    const url = (owner_url || '').trim();
    if (email && !validator.isEmail(email)) {
        flash(req, 'Owner email must be a valid email address.', 'error');
        return res.redirect('/admin/settings');
    }
    // Validate the URL (join/update forms already do) so it can't hold a
    // javascript:/data: value that would run when rendered as a link.
    if (
        url &&
        !validator.isURL(url, {
            require_protocol: true,
            protocols: ['http', 'https'],
        })
    ) {
        flash(req, 'Owner URL must be a valid http(s) URL.', 'error');
        return res.redirect('/admin/settings');
    }

    queries.updateListing({
        id: listing.id,
        name: (name || '').trim() || listing.name, // never blank out the title
        description: (description || '').trim() || null,
        owner_name: (owner_name || '').trim() || null,
        owner_email: email || null,
        owner_url: url || null,
    });
    flash(req, 'Settings saved.', 'success');
    res.redirect('/admin/settings');
});

router.get('/members', (req, res) => {
    const listing = queries.getListing();
    const statusFilter = req.query.status || 'all';
    let members = queries.getAllMembers(listing.id);
    if (statusFilter !== 'all') {
        members = members.filter((m) => m.status === statusFilter);
    }
    res.render('admin/members', { listing, members, statusFilter });
});

router.post('/members/:id/approve', (req, res) => {
    const member = queries.getMemberById(req.params.id);
    if (approveAndNotify(member))
        flash(req, `Approved ${member.name}.`, 'success');
    res.redirect('/admin/members');
});

router.post('/members/:id/reject', (req, res) => {
    const member = queries.getMemberById(req.params.id);
    if (member && member.status !== 'rejected') {
        queries.rejectMember(member.id);
        flash(req, `Rejected ${member.name}.`, 'success');
    }
    res.redirect('/admin/members');
});

router.post('/members/bulk', (req, res) => {
    const ids = [].concat(req.body.ids || []);
    const action = req.body.action;
    if (action !== 'approve' && action !== 'reject')
        return res.redirect('/admin/members');

    let count = 0;
    for (const id of ids) {
        const member = queries.getMemberById(id);
        if (!member) continue;
        if (action === 'approve') {
            if (approveAndNotify(member)) count++;
        } else if (member.status !== 'rejected') {
            queries.rejectMember(member.id);
            count++;
        }
    }
    // Count reflects members that actually changed, not the raw selection size.
    flash(
        req,
        `${action === 'approve' ? 'Approved' : 'Rejected'} ${count} member(s).`,
        'success',
    );
    res.redirect('/admin/members');
});

module.exports = router;
