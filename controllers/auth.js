const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');

const User = require('../models/user');

// sendgridTransport() returns a configuration nodemailer can use to use SendGrid
const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_key:
        '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',
    },
  })
);

exports.getLogin = (req, res, next) => {
  let message = req.flash('error');
  // Workaround to solve issue of user message div being rendered even if no error, since otherwise errorMessage holds an empty array (truthy)
  message.length > 0 ? (message = message[0]) : (message = null);
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    // Only set if there was an error (no user with email/password) from login POST request. Whatever was stored under key 'error' is retrieved and stored in errorMessage, and then this info is removed from session
    errorMessage: message,
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash('error');
  message.length > 0 ? (message = message[0]) : (message = null);
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Sign Up',
    errorMessage: message,
  });
};

exports.postLogin = (req, res, next) => {
  const { email, password } = req.body;
  User.findOne({ email })
    .then((user) => {
      if (!user) {
        // Key under which message will be stored, and message. Available in session until used
        req.flash('error', 'Invalid email or password.');
        return res.redirect('/login');
      }
      // Validate password. bcrypt can compare password to hashed value, and can determine whether hashed value makes sense, taking into account hashing algorithm used. So if it were hashed, could it result in hashed password?
      bcrypt
        .compare(password, user.password)
        // Will make it into then block regardless of whether passwords match. Result will be a boolean that is true if passwords are equal, false otherwise
        .then((doMatch) => {
          if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save((err) => {
              if (err) {
                console.log(err);
              }
              res.redirect('/');
            });
          }
          req.flash('error', 'Invalid email or password.');
          res.redirect('/login');
        })
        .catch((err) => {
          console.log(err);
          res.redirect('/login');
        });
    })
    .catch((err) => console.log(err));
};

exports.postSignup = (req, res, next) => {
  // Will validate user input later
  const { email, password, confirmPassword } = req.body;
  // Look for email field in documents in users collection (email: email)
  User.findOne({ email })
    .then((userDoc) => {
      if (userDoc) {
        req.flash('error', 'Email already in use.');
        return res.redirect('/signup');
      }
      // Generates hashed password. Asynchronous task; returns a promise. Second arg is salt value, how many rounds of hashing will be applied
      return bcrypt
        .hash(password, 12)
        .then((hashedPassword) => {
          const user = new User({
            email,
            password: hashedPassword,
            cart: { items: [] },
          });
          return user.save();
        })
        .then((result) => {
          res.redirect('/login');
          // sendMail() provides a promise. Returning in order to chain .catch() and catch any errors
          return transporter.sendMail({
            to: email,
            from: 'shop@nodecomplete.com',
            subject: 'Welcome to Node Shop!',
            html: '<h1>You have successfully signed up.</h1>',
          });
        })
        .catch((err) => console.log(err));
    })
    .catch((err) => console.log(err));
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    }
    res.redirect('/');
  });
};
