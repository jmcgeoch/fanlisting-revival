const express = require('express');
const queries = require('../lib/queries');
const { verifyPassword, requireAdmin } = require('../lib/auth');
const { flash } = require('../lib/flash');
const { sendTemplateEmail } = require('../lib/mailer');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session.adminId) return res.redirect('/admin');
  res.render('admin/login', { error: null, layout: 'main' });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const admin = queries.getAdminByEmail((email || '').trim().toLowerCase());
  if (!admin || !verifyPassword(password || '', admin.password_hash)) {
    return res.status(401).render('admin/login', { error: 'Invalid email or password.' });
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
  if (member) {
    queries.approveMember(member.id);
    sendTemplateEmail(member.email, "You're approved for {{listingName}}!", 'approved', {
      name: member.name,
      listingName: queries.getListing().name,
    }).catch((err) => console.error('Failed to send approval email:', err));
    flash(req, `Approved ${member.name}.`, 'success');
  }
  res.redirect('/admin/members');
});

router.post('/members/:id/reject', (req, res) => {
  const member = queries.getMemberById(req.params.id);
  if (member) {
    queries.rejectMember(member.id);
    flash(req, `Rejected ${member.name}.`, 'success');
  }
  res.redirect('/admin/members');
});

router.post('/members/bulk', (req, res) => {
  const ids = [].concat(req.body.ids || []);
  const action = req.body.action;
  for (const id of ids) {
    if (action === 'approve') {
      queries.approveMember(id);
      const member = queries.getMemberById(id);
      if (member) {
        sendTemplateEmail(member.email, "You're approved for {{listingName}}!", 'approved', {
          name: member.name,
          listingName: queries.getListing().name,
        }).catch((err) => console.error('Failed to send approval email:', err));
      }
    } else if (action === 'reject') {
      queries.rejectMember(id);
    }
  }
  flash(req, `${action === 'approve' ? 'Approved' : 'Rejected'} ${ids.length} member(s).`, 'success');
  res.redirect('/admin/members');
});

module.exports = router;
