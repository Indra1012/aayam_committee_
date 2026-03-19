const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

const BASE_URL =
  process.env.BASE_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  "http://localhost:5000";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${BASE_URL}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // ✅ Guard: profile must have emails
        if (!profile.emails || profile.emails.length === 0) {
          return done(null, false, { message: "No email from Google" });
        }

        const email = profile.emails[0].value;

        // ✅ Guard: email must exist
        if (!email) {
          return done(null, false, { message: "Empty email from Google" });
        }

        let user = await User.findOne({ email });
        if (!user) {
          user = await User.create({
            name: profile.displayName,
            email,
            password: "google-auth",
            role: "user",
            isActive: true,
          });
        }
        return done(null, user);
      } catch (err) {
        console.error("Google OAuth Strategy Error:", err.message);
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});