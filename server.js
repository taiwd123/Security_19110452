const path = require("path");
const fs = require("fs");
const express = require("express");
const https = require("https");
const helmet = require("helmet");
const PORT = 3000;
const passport = require("passport");
const { Strategy } = require("passport-google-oauth20");
const cookieSession = require("cookie-session");
require("dotenv").config();

const config = {
  CLIENT_ID: process.env.CLIENT_ID,
  CLIENT_SECRET: process.env.CLIENT_SECRET,
  COOKIE_KEY_1: process.env.COOKIE_KEY_1,
  COOKIE_KEY_2: process.env.COOKIE_KEY_2,
};

const AUTH_OPTIONS = {
  callbackURL: "/auth/google/callback",
  clientID: config.CLIENT_ID,
  clientSecret: config.CLIENT_SECRET,
};
function verifyCallback(accessToken, refreshToken, profile, done) {
  console.log("Google profile", profile);
  done(null, profile);
}
passport.use(new Strategy(AUTH_OPTIONS, verifyCallback));

passport.serializeUser((user,done)=>{
  done(null,user.id)
})

passport.deserializeUser((id,done)=>{
  done(null,id)
})

const app = express();

app.use(helmet());


app.use(
  cookieSession({
    name: 'session',
    maxAge: 60 * 60 * 1000 * 24,
    keys: [config.COOKIE_KEY_1, config.COOKIE_KEY_2], //'secret key'
  })
);
app.use(passport.initialize());
app.use(passport.session())

function checkLoggedIn(req, res, next) {
  console.log(`Current login user is: ${req.user}`);
  const isLoggedIn = req.isAuthenticated() && req.user;
  if (!isLoggedIn) {
    res.status(401).json({
      error: "Not logged in",
    });
  }
  next();
}

app.get("/secret", checkLoggedIn, (req, res) => {
  return res.send("Your personal secret value is 42!");
});
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["email"],
  })
);
app.get(
  "/auth/google/callback",
  passport.authenticate('google', {
    failureRedirect: "/failure",
    successRedirect: "/",
    session: true,
  }),
  (req, res) => {
    console.log("Google call us back !");
  }
);
app.get("/auth/logout", (req, res) => {
  req.logout();
  return res.redirect('/')
});

app.get("/failure", (req, res) => {
  return res.send("Failed to login");
});
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
https
  .createServer(
    {
      key: fs.readFileSync("key.pem"),
      cert: fs.readFileSync("cret.pem"),
    },
    app
  )
  .listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
  });