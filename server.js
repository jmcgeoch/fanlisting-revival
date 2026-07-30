require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const { engine } = require('express-handlebars');

const config = require('./config');
const migrate = require('./db/migrate');
const { flashMiddleware } = require('./lib/flash');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

migrate();

const app = express();

app.engine(
  'handlebars',
  engine({
    helpers: {
      eq: (a, b) => a === b,
    },
  })
);
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 },
  })
);
app.use(flashMiddleware);

app.use('/', publicRoutes);
app.use('/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).send('Not found');
});

app.listen(config.port, () => {
  console.log(`Fanlisting running at http://localhost:${config.port}`);
});
