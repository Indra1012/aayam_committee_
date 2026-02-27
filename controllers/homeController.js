const HomeGallery = require("../models/HomeGallery");

exports.getHome = async (req, res) => {
  const whatWeDoImages = await HomeGallery.find({ section: "what_we_do" }).limit(4);
  const eventImages = await HomeGallery.find({ section: "events" }).limit(4);

  res.render("home", {
    whatWeDoImages,
    eventImages,
  });
};


exports.addImage = async (req, res) => {
  const { section } = req.body;

  if (!req.file || !section) return res.redirect("/");

  const count = await HomeGallery.countDocuments({ section });
  if (count >= 4) return res.redirect("/");

  await HomeGallery.create({
    image: `/uploads/home/${req.file.filename}`,
    section,
  });

  res.redirect("/");
};


exports.deleteImage = async (req, res) => {
  await HomeGallery.findByIdAndDelete(req.params.id);
  res.redirect("/");
};
