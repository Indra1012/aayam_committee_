const ReachOut = require("../models/ReachOut");

/* ===============================
   SHOW FORM (PUBLIC)
================================ */
exports.getReachOutForm = (req, res) => {
  res.render("reachout/index", {
    success: req.query.success || false,
  });
};

/* ===============================
   SUBMIT FORM (PUBLIC)
================================ */
exports.submitReachOutForm = async (req, res) => {
  try {
    console.log("REQ BODY:", req.body); // TEMP DEBUG

    const { name, email, contact, purpose, message } = req.body;

    if (!name || !email || !purpose || !message) {
      return res.redirect("/reachout");
    }

    await ReachOut.create({
      name,
      email,
      contact,
      purpose,
      message,
    });

    res.redirect("/reachout?success=true");
  } catch (error) {
    console.error("ReachOut Submit Error:", error);
    res.redirect("/reachout");
  }
};


/* ===============================
   ADMIN: VIEW ALL
================================ */
exports.getAllReachOuts = async (req, res) => {
  try {
    const reachouts = await ReachOut.find()
      .sort({ createdAt: -1 })
      .lean();

    res.render("admin/reachout/index", { reachouts });
  } catch (error) {
    console.error("Admin ReachOut Error:", error);
    res.redirect("/");
  }
};

/* ===============================
   TOGGLE READ / UNREAD
================================ */
exports.toggleReadStatus = async (req, res) => {
  try {
    const item = await ReachOut.findById(req.params.id);
    if (!item) return res.redirect("/admin/reachout");

    item.isRead = !item.isRead;
    await item.save();

    res.redirect("/admin/reachout");
  } catch (error) {
    console.error("Toggle Read Error:", error);
    res.redirect("/admin/reachout");
  }
};

/* ===============================
   DELETE (SPAM)
================================ */
exports.deleteReachOut = async (req, res) => {
  try {
    await ReachOut.findByIdAndDelete(req.params.id);
    res.redirect("/admin/reachout");
  } catch (error) {
    console.error("Delete ReachOut Error:", error);
    res.redirect("/admin/reachout");
  }
};
