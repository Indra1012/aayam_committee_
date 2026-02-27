const User = require("../models/User");
const bcrypt = require("bcryptjs");

/* =================================
   ADMIN DASHBOARD
================================= */
exports.getAdminDashboard = async (req, res) => {
  try {
    const admins = await User.find({
      role: { $in: ["admin", "superadmin"] },
    }).lean();

    res.render("admin/index", { admins });
  } catch (error) {
    console.error("Admin Dashboard Error:", error);
    res.redirect("/");
  }
};

/* =================================
   INVITE ADMIN (MAX 10 ADMINS)
================================= */
exports.inviteAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.redirect("/admin");

    // Limit only ACTIVE admins
    const count = await User.countDocuments({
      role: "admin",
      isActive: true
    });

    if (count >= 10) return res.redirect("/admin");

    const existing = await User.findOne({ email });

    // 🟢 USER ALREADY EXISTS → UPGRADE ROLE
    if (existing) {
      existing.role = "admin";
      existing.isActive = true;
      await existing.save();
      return res.redirect("/admin");
    }

    // 🟢 NEW ADMIN CREATION
    const hashed = await bcrypt.hash(password, 10);

    await User.create({
      email,
      password: hashed,
      role: "admin",
      isActive: true,
    });

    res.redirect("/admin");

  } catch (error) {
    console.error("Invite Admin Error:", error);
    res.redirect("/admin");
  }
};


/* =================================
   ACTIVATE / DEACTIVATE ADMIN
================================= */
exports.toggleAdminStatus = async (req, res) => {
  try {
    const admin = await User.findById(req.params.id);
    if (!admin) return res.redirect("/admin");

    // ❌ Superadmin cannot be deactivated
    if (admin.role === "superadmin") return res.redirect("/admin");

    admin.isActive = !admin.isActive;
    await admin.save();

    res.redirect("/admin");
  } catch (error) {
    console.error("Toggle Admin Error:", error);
    res.redirect("/admin");
  }
};

/* =================================
   DELETE ADMIN
================================= */
/* ===============================
   DELETE ADMIN
================================ */

/* ===============================
   DELETE ADMIN (SUPERADMIN)
================================ */
exports.deleteAdmin = async (req, res) => {
  try {
    const admin = await User.findById(req.params.id);

    // Safety — cannot delete superadmin
    if (!admin || admin.role === "superadmin") {
      return res.redirect("/admin");
    }

    await User.findByIdAndDelete(req.params.id);

    res.redirect("/admin");
  } catch (error) {
    console.error("Delete Admin Error:", error);
    res.redirect("/admin");
  }
};




/* =================================
   CHANGE SUPER ADMIN
================================= */
exports.makeSuperAdmin = async (req, res) => {
  try {
    const newSuperAdmin = await User.findById(req.params.id);
    if (!newSuperAdmin) return res.redirect("/admin");

    // Already superadmin
    if (newSuperAdmin.role === "superadmin") return res.redirect("/admin");

    // Demote current superadmin
    await User.updateMany(
      { role: "superadmin" },
      { role: "admin" }
    );

    // Promote new one
    newSuperAdmin.role = "superadmin";
    newSuperAdmin.isActive = true; // ensure active
    await newSuperAdmin.save();

    res.redirect("/admin");
  } catch (error) {
    console.error("Make Super Admin Error:", error);
    res.redirect("/admin");
  }
};
