const express = require('express');
const { body, validationResult } = require('express-validator');
const queries = require('../lib/queries');
const { sendTemplateEmail } = require('../lib/mailer');
const config = require('../config');
const countries = require('../lib/countries');

const router = express.Router();

router.get('/', (req, res) => {
  const listing = queries.getListing();
  const members = queries.getApprovedMembers(listing.id);
  res.render('public/home', { listing, members });
});

router.get('/join', (req, res) => {
  const listing = queries.getListing();
  res.render('public/join', { listing, values: {}, errors: [], countries });
});

router.post(
  '/join',
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
    const listing = queries.getListing();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('public/join', {
        listing,
        values: req.body,
        errors: errors.array(),
        countries,
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

    sendTemplateEmail(email, 'Thanks for joining {{listingName}}!', 'welcome-pending', {
      name,
      listingName: listing.name,
    }).catch((err) => console.error('Failed to send welcome email:', err));

    if (config.ownerEmail) {
      sendTemplateEmail(
        config.ownerEmail,
        'New member joined {{listingName}}',
        'new-member-owner',
        { name, email, listingName: listing.name }
      ).catch((err) => console.error('Failed to send owner notification:', err));
    }

    res.render('public/join-thanks', { listing });
  }
);

module.exports = router;
