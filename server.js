require('dotenv').config(); // Esta linha deve ser uma das primeiras no arquivo

const express = require('express');
const app = express();
const https = require('https');
const fs = require('fs');
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('./models/User'); // Certifique-se de que este modelo está definido corretamente

const dbURI = process.env.MONGO_URI; // Certifique-se de que MONGO_URI está definido no seu arquivo .env

// Conexão com o MongoDB
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('Error connecting to MongoDB:', err));

// Configurações básicas
app.use(express.static('public'));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(session({
  secret: 'very secret',
  resave: false,
  saveUninitialized: true,
}));

// Configuração do Passport para autenticação
passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return done(null, false, { message: 'Incorrect username.' });
    }
    if (!await user.comparePassword(password)) {
      return done(null, false, { message: 'Incorrect password.' });
    }
    return done(null, user);
  } catch (e) {
    return done(e);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

app.use(passport.initialize());
app.use(passport.session());

// Rotas
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/generate-qr', async (req, res) => {
  const { documentId, studentName, course, dateIssued } = req.query;
  const newDiploma = new Diploma({ documentId, studentName, course, dateIssued });

  try {
    const savedDiploma = await newDiploma.save();
    const qrData = `${req.headers.host}/verify-qr?documentId=${savedDiploma.documentId}`;
    const qrImage = await QRCode.toDataURL(qrData);
    res.send(`<img src="${qrImage}">`);
  } catch (err) {
    res.status(500).send('Error saving diploma data');
  }
});

app.get('/verify-qr', async (req, res) => {
  const { documentId } = req.query;
  const diploma = await Diploma.findOne({ documentId });

  if (diploma) {
    res.send(`Diploma Verified: ${diploma.studentName} - ${diploma.course}`);
  } else {
    res.status(404).send('Diploma not found');
  }
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}));

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

// HTTPS configuração
const options = {
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.cert')
};

https.createServer(options, app).listen(3000, () => {
  console.log('Server is running on https://localhost:3000');
});
