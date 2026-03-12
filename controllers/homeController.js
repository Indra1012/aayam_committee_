const HomeGallery = require("../models/HomeGallery");
const HomePromo   = require("../models/HomePromo");

exports.getHome = async (req, res) => {
  const whatWeDoImages = await HomeGallery.find({ section: "what_we_do" }).limit(4);
  const eventImages    = await HomeGallery.find({ section: "events" }).limit(4);
  const promo          = await HomePromo.findOne({ isActive: true }).sort({ createdAt: -1 }).lean();

  res.render("home", { whatWeDoImages, eventImages, promo: promo || null });
};

exports.addImage = async (req, res) => {
  try {
    const { section } = req.body;
    if (!req.file || !section) return res.redirect("/");
    const count = await HomeGallery.countDocuments({ section });
    if (count >= 4) return res.redirect("/");
    await HomeGallery.create({ image: req.file.path, section });
    res.redirect("/");
  } catch (err) {
    console.error("Add Image Error:", err.message);
    res.status(500).send("Error uploading image");
  }
};

exports.deleteImage = async (req, res) => {
  try {
    await HomeGallery.findByIdAndDelete(req.params.id);
    res.redirect("/");
  } catch (err) {
    console.error("Delete Image Error:", err.message);
    res.redirect("/");
  }
};

/* ── PROMO CRUD ── */

exports.addPromo = async (req, res) => {
  try {
    const { label, title, heading, description, link, eventDate } = req.body;  // ← heading added
    if (!title) return res.redirect("/");
    await HomePromo.updateMany({}, { isActive: false });
    await HomePromo.create({
      label:       label       || "Register Now",
      title,
      heading:     heading     || "",   // ← NEW
      description: description || "",
      link:        link        || "",
      eventDate:   eventDate   || null,
      isActive:    true,
    });
    res.redirect("/");
  } catch (err) {
    console.error("Add Promo Error:", err.message);
    res.redirect("/");
  }
};

exports.deletePromo = async (req, res) => {
  try {
    await HomePromo.findByIdAndDelete(req.params.id);
    res.redirect("/");
  } catch (err) {
    console.error("Delete Promo Error:", err.message);
    res.redirect("/");
  }
};

exports.togglePromo = async (req, res) => {
  try {
    const promo = await HomePromo.findById(req.params.id);
    if (promo) { promo.isActive = !promo.isActive; await promo.save(); }
    res.redirect("/");
  } catch (err) {
    console.error("Toggle Promo Error:", err.message);
    res.redirect("/");
  }
};