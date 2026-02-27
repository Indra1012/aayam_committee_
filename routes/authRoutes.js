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
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth" }),
  (req, res) => {
    req.session.user = {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      isActive: req.user.isActive,
    };

    req.session.save(() => res.redirect("/"));
  }
);

/* ===============================
   LOGOUT
================================ */
router.get("/logout", auth.logout);

module.exports = router;
