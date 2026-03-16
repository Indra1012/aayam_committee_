const express = require("express");
const router = express.Router();
const auth = require("../controllers/authController");
const passport = require("passport");

/* ===============================
   AUTH PAGE (Login + Signup UI)
================================ */
router.get("/auth", auth.authPage);

/* ===============================
   EMAIL LOGIN / SIGNUP
================================ */
router.post("/auth/email", auth.emailAuth);

/* ===============================
   GOOGLE AUTH
================================ */

// Step 1 — Redirect to Google
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Step 2 — Google callback
router.get("/auth/google/callback", (req, res, next) => {
  passport.authenticate("google", (err, user) => {
    if (err || !user) {
      console.error("OAuth error:", err?.message || "No user returned");
      return res.redirect("/auth?error=google_failed");
    }

    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    };

    req.session.save(() => res.redirect("/"));
  })(req, res, next);
});

/* ===============================
   LOGOUT
================================ */
router.get("/logout", auth.logout);

module.exports = router;