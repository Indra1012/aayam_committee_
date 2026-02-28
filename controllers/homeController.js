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
  try {
    const { section } = req.body;

    if (!req.file || !section) return res.redirect("/");

    const count = await HomeGallery.countDocuments({ section });
    if (count >= 4) return res.redirect("/");

    await HomeGallery.create({
      // file.path is the Cloudinary URL (works locally and on Render)
      image: req.file.path,
      section,
    });

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