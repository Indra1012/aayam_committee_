// routes/adminRoutes.js
const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const { isAdmin, isSuperAdmin } = require("../middlewares/authMiddleware"); // Added missing "

/* ===============================
   ADMIN DASHBOARD
================================ */

// Admin dashboard (admin + superadmin)
router.get("/admin", isAdmin, adminController.getAdminDashboard);

/* ===============================
   SUPER ADMIN CONTROLS
================================ */

// Invite new admin (max 10)
router.post("/admin/invite", isSuperAdmin, adminController.inviteAdmin);

// Activate / Deactivate admin
router.post("/admin/toggle/:id", isSuperAdmin, adminController.toggleAdminStatus);

// Make another admin as super admin
router.post("/admin/make-super/:id", isSuperAdmin, adminController.makeSuperAdmin);
// DELETE ADMIN
router.post("/admin/delete/:id", isSuperAdmin, adminController.deleteAdmin);


module.exports = router;