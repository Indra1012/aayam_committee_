const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

/* ===============================
   BASE URL LOGIC
   - Uses BASE_URL env var if set (your custom domain)
   - Falls back to RENDER_EXTERNAL_URL (auto-set by Render)
   - Falls back to localhost for development
================================ */
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
        const email = profile.emails[0].value;

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
        done(err, null);
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



// ```

// // ---

// // ## How the fallback chain works
// // ```
// BASE_URL set in Render env?  →  uses aayam.online         ✅ custom domain
// BASE_URL not set?            →  uses RENDER_EXTERNAL_URL  ✅ render URL (auto)
// Neither set?                 →  uses localhost:5000        ✅ local dev
// ```

// `RENDER_EXTERNAL_URL` is **automatically provided by Render** — you don't need to set it manually. So:

// - When your custom domain is connected → set `BASE_URL=https://aayam.online` in Render env
// - When you disconnect the domain later → just **delete** `BASE_URL` from Render env variables, and it automatically falls back to the Render URL
// - Local dev always works without touching anything

// ---

// ## ⚠️ One thing to remember
// In **Google Cloud Console**, make sure **both** callback URLs are whitelisted:
// ```
// https://aayam.online/auth/google/callback
// https://aayam-committee.onrender.com/auth/google/callback