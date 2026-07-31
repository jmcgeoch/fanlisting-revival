const fs = require('fs');
const path = require('path');
const db = require('./connection');

function migrate() {
    db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

    const dir = path.join(__dirname, 'migrations');
    const applied = new Set(
        db
            .prepare('SELECT name FROM _migrations')
            .all()
            .map((r) => r.name),
    );

    const files = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.sql'))
        .sort();

    for (const file of files) {
        if (applied.has(file)) continue;
        const sql = fs.readFileSync(path.join(dir, file), 'utf8');
        const run = db.transaction(() => {
            db.exec(sql);
            db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
        });
        run();
        console.log(`Applied migration: ${file}`);
    }
}

module.exports = migrate;
