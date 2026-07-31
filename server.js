require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const { csrfSync } = require('csrf-sync');
const { engine } = require('express-handlebars');

const config = require('./config');
const migrate = require('./db/migrate');
const { flashMiddleware } = require('./lib/flash');

// Migrate BEFORE requiring the routes: lib/queries prepares its SQL
// statements at require-time, so any column added by a pending migration must
// already exist by then — otherwise the very boot that should apply the
// migration crashes while preparing a statement that references the new
// column.
migrate();

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();

app.engine(
    'handlebars',
    engine({
        partialsDir: path.join(__dirname, 'views/partials'),
        helpers: {
            eq: (a, b) => a === b,
            // SQLite stores timestamps as "YYYY-MM-DD HH:MM:SS" (UTC). Render just
            // the date part in a readable long form; fall back to the raw value if
            // it isn't parseable.
            formatDate: (value) => {
                if (!value) return '';
                const d = new Date(String(value).replace(' ', 'T') + 'Z');
                if (Number.isNaN(d.getTime())) return value;
                return d.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                });
            },
        },
    }),
);
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Secure cookies sit behind a reverse proxy in production (Nginx, Fly, etc.).
if (config.isProduction) app.set('trust proxy', 1);

// Security headers. Keep a real Content-Security-Policy, but allow inline
// event-handler attributes (a few onclick/onchange in the templates) and drop
// upgrade-insecure-requests in development so http://localhost assets load.
const cspDirectives = {
    'script-src-attr': ["'unsafe-inline'"],
    // helmet merges these over its defaults; setting a directive to null removes
    // it. Drop upgrade-insecure-requests in dev so http://localhost assets load.
    ...(config.isProduction ? {} : { 'upgrade-insecure-requests': null }),
};
app.use(helmet({ contentSecurityPolicy: { directives: cspDirectives } }));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
    session({
        secret: config.sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: 'lax',
            secure: config.isProduction,
            maxAge: 1000 * 60 * 60 * 24 * 7,
        },
    }),
);
app.use(flashMiddleware);

// CSRF protection (synchroniser-token pattern, backed by the session). The
// token is read from a hidden `_csrf` form field and exposed to every view as
// `csrfToken` for the forms to embed.
const { generateToken, csrfSynchronisedProtection } = csrfSync({
    getTokenFromRequest: (req) => req.body._csrf,
});
app.use(csrfSynchronisedProtection);
app.use((req, res, next) => {
    res.locals.csrfToken = generateToken(req);
    next();
});

app.use('/', publicRoutes);
app.use('/admin', adminRoutes);

app.use((req, res) => {
    res.status(404).send('Not found');
});

// Error handler — avoids leaking stack traces (Express's default page shows
// them unless NODE_ENV=production). A rejected CSRF token surfaces as 403.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    if (status === 403) {
        return res
            .status(403)
            .send(
                'Invalid or expired form submission — please go back and try again.',
            );
    }
    console.error(err);
    res.status(500).send('Something went wrong.');
});

// Only start listening when run directly (`node server.js`). When required by
// the test suite, export the configured app so supertest can drive it without
// binding a port.
if (require.main === module) {
    app.listen(config.port, () => {
        console.log(`Fanlisting running at http://localhost:${config.port}`);
    });
}

module.exports = app;
