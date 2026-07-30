require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  dbPath: process.env.DB_PATH || './data/fanlisting.db',
  listingName: process.env.LISTING_NAME || 'My Fanlisting',
  ownerEmail: process.env.OWNER_EMAIL || '',
  mail: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'Fanlisting <no-reply@example.com>',
  },
};
