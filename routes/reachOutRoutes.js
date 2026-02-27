const express = require("express");
const router = express.Router();

const reachOutController = require("../controllers/reachOutController");
const { isAdmin } = require("../middlewares/authMiddleware");

/* ===============================
   PUBLIC ROUTES
================================ */

// Show Reach Out form
router.get("/reachout", reachOutController.getReachOutForm);

// Submit Reach Out form
router.post("/reachout", reachOutController.submitReachOutForm);

/* ===============================
   ADMIN ROUTES
================================ */

// View all reach outs
router.get(
  "/admin/reachout",
  isAdmin,
  reachOutController.getAllReachOuts
);

// Toggle read / unread
router.post(
  "/admin/reachout/:id/toggle-read",
  isAdmin,
  reachOutController.toggleReadStatus
);

// Delete reach out (spam)
router.post(
  "/admin/reachout/:id/delete",
  isAdmin,
  reachOutController.deleteReachOut
);

module.exports = router;
