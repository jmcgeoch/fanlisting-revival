const crypto = require('crypto');
const express = require('express');
const { body, validationResult } = require('express-validator');
const queries = require('../lib/queries');
const { sendTemplateEmail } = require('../lib/mailer');
const config = require('../config');
const countries = require('../lib/countries');
const { getHeroImagePath } = require('../lib/theme');
const { emailLimiter } = require('../lib/ratelimit');

const router = express.Router();

// Absolute base URL for links embedded in emails / copy-paste snippets. Prefer
// the configured APP_URL; fall back to the request host only in development
// (trusting the Host header in production enables link-hijacking — see config).
function baseUrl(req) {
    return config.appUrl || `${req.protocol}://${req.get('host')}`;
}

const HOME_PREVIEW_COUNT = 10; // recent members shown on the home page
const MEMBERS_PER_PAGE = 50; // pagination size on /members
const EDIT_TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // magic link valid for 24h

// Shared across every public page: the listing, its optional hero image (used
// by the header partial), and listing stats (counts + last-updated, used by
// the footer partial).
router.use((req, res, next) => {
    const listing = queries.getListing();
    res.locals.listing = listing;
    res.locals.heroImagePath = getHeroImagePath(listing.theme);
    res.locals.stats = queries.getListingStats(listing.id);
    next();
});

router.get('/', (req, res) => {
    const members = queries.getRecentApprovedMembers(
        res.locals.listing.id,
        HOME_PREVIEW_COUNT,
    );
    res.render('public/home', {
        members,
        hasMore: res.locals.stats.approvedCount > members.length,
        active: 'home',
    });
});

// Full, filterable, paginated approved-member list.
router.get('/members', (req, res) => {
    const listingId = res.locals.listing.id;
    const availableCountries = queries.getApprovedCountries(listingId);

    const country =
        req.query.country && availableCountries.includes(req.query.country)
            ? req.query.country
            : null;

    const total = queries.countApprovedMembers({ listingId, country });
    const totalPages = Math.max(1, Math.ceil(total / MEMBERS_PER_PAGE));
    const page = Math.min(
        Math.max(1, parseInt(req.query.page, 10) || 1),
        totalPages,
    );
    const offset = (page - 1) * MEMBERS_PER_PAGE;

    const members = queries.getApprovedMembersPage({
        listingId,
        country,
        limit: MEMBERS_PER_PAGE,
        offset,
    });

    // Preserve the active country filter across pagination links.
    const countryQuery = country
        ? `&country=${encodeURIComponent(country)}`
        : '';

    res.render('public/members', {
        members,
        availableCountries,
        selectedCountry: country,
        total,
        page,
        totalPages,
        hasPrev: page > 1,
        hasNext: page < totalPages,
        prevPage: page - 1,
        nextPage: page + 1,
        countryQuery,
        active: 'members',
    });
});

router.get('/join', (req, res) => {
    res.render('public/join', {
        values: {},
        errors: [],
        countries,
        active: 'join',
    });
});

router.post(
    '/join',
    emailLimiter,
    [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('email').trim().isEmail().withMessage('A valid email is required'),
        body('url')
            .optional({ checkFalsy: true })
            .trim()
            .isURL()
            .withMessage('URL must be valid'),
        body('country')
            .trim()
            .notEmpty()
            .withMessage('Country is required')
            .isIn(countries)
            .withMessage('Please choose a country from the list'),
    ],
    (req, res) => {
        const listing = res.locals.listing;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('public/join', {
                values: req.body,
                errors: errors.array(),
                countries,
                active: 'join',
            });
        }

        const { name, email, url, country } = req.body;
        queries.insertMember({
            listing_id: listing.id,
            name,
            email,
            url: url || null,
            country,
        });

        sendTemplateEmail(
            email,
            'Thanks for joining {{listingName}}!',
            'welcome-pending',
            {
                name,
                listingName: listing.name,
            },
        ).catch((err) => console.error('Failed to send welcome email:', err));

        if (config.ownerEmail) {
            sendTemplateEmail(
                config.ownerEmail,
                'New member joined {{listingName}}',
                'new-member-owner',
                { name, email, listingName: listing.name },
            ).catch((err) =>
                console.error('Failed to send owner notification:', err),
            );
        }

        res.render('public/join-thanks', { active: 'join' });
    },
);

// --- Member self-service update via emailed magic link -------------------
// No member passwords: a member enters their email, we email a one-time link,
// and that link opens a pre-filled edit form. Email itself stays locked.

router.get('/update', (req, res) => {
    res.render('public/update-request', { sent: false, active: null });
});

router.post('/update', emailLimiter, (req, res) => {
    const listing = res.locals.listing;
    const email = (req.body.email || '').trim().toLowerCase();
    const member = email ? queries.getMemberByEmail(listing.id, email) : null;

    // Only approved members can edit; pending/rejected can't. We still show the
    // same confirmation regardless, so the form never reveals who's a member.
    if (member && member.status === 'approved') {
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + EDIT_TOKEN_TTL_MS).toISOString();
        queries.setMemberEditToken({ id: member.id, token, expires });

        const editUrl = `${baseUrl(req)}/update/${token}`;
        sendTemplateEmail(
            member.email,
            'Update your details on {{listingName}}',
            'edit-link',
            {
                name: member.name,
                listingName: listing.name,
                editUrl,
                expiresIn: '24 hours',
            },
        ).catch((err) => console.error('Failed to send edit-link email:', err));
    }

    res.render('public/update-request', { sent: true, active: null });
});

// Load a member from a magic-link token, or null if missing/expired.
function memberFromToken(token) {
    const member = queries.getMemberByEditToken(token);
    if (!member || !member.edit_token_expires) return null;
    if (new Date(member.edit_token_expires).getTime() < Date.now()) return null;
    if (member.status !== 'approved') return null;
    return member;
}

router.get('/update/:token', (req, res) => {
    const member = memberFromToken(req.params.token);
    if (!member) {
        return res
            .status(400)
            .render('public/update-invalid', { active: null });
    }
    res.render('public/update-form', {
        token: req.params.token,
        values: member,
        errors: [],
        countries,
        active: null,
    });
});

router.post(
    '/update/:token',
    [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('url')
            .optional({ checkFalsy: true })
            .trim()
            .isURL()
            .withMessage('URL must be valid'),
        body('country')
            .trim()
            .notEmpty()
            .withMessage('Country is required')
            .isIn(countries)
            .withMessage('Please choose a country from the list'),
    ],
    (req, res) => {
        const member = memberFromToken(req.params.token);
        if (!member) {
            return res
                .status(400)
                .render('public/update-invalid', { active: null });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('public/update-form', {
                token: req.params.token,
                // Keep the locked email visible while re-showing edited values.
                values: { ...req.body, email: member.email },
                errors: errors.array(),
                countries,
                active: null,
            });
        }

        const { name, url, country } = req.body;
        queries.updateMemberDetails({
            id: member.id,
            name,
            url: url || null,
            country,
        });
        queries.clearMemberEditToken(member.id); // one-time use

        res.render('public/update-thanks', { active: null });
    },
);

router.get('/buttons', (req, res) => {
    res.render('public/buttons', { siteUrl: baseUrl(req), active: 'buttons' });
});

module.exports = router;
