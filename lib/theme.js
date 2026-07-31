const fs = require('fs');
const path = require('path');

// Looks for an optional hero image dropped into a theme's folder. No schema
// change needed — an owner just adds public/themes/<theme>/hero.(jpg|png|svg)
// and it shows up automatically under the site title.
function getHeroImagePath(theme) {
    const candidates = ['hero.jpg', 'hero.png', 'hero.svg'];
    for (const file of candidates) {
        const abs = path.join(__dirname, '..', 'public', 'themes', theme, file);
        if (fs.existsSync(abs)) return `/themes/${theme}/${file}`;
    }
    return null;
}

module.exports = { getHeroImagePath };
