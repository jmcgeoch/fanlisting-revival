// Minimal session-based flash message helper

function flash(req, message, type = 'info') {
    req.session.flash = { message, type };
}

function flashMiddleware(req, res, next) {
    res.locals.flash = req.session.flash || null;
    delete req.session.flash;
    next();
}

module.exports = { flash, flashMiddleware };
