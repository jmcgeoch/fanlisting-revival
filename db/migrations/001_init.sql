CREATE TABLE listing (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  theme TEXT DEFAULT 'default',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE member (
  id INTEGER PRIMARY KEY,
  listing_id INTEGER NOT NULL REFERENCES listing(id),
  name TEXT NOT NULL,
  url TEXT,
  email TEXT NOT NULL,
  country TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
  approved_at TEXT
);

CREATE TABLE admin_user (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);

INSERT INTO listing (name, slug, description)
VALUES ('My Fanlisting', 'main', 'Welcome! Fill in your details below to join.');
