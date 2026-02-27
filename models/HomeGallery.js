const mongoose = require("mongoose");

const homeGallerySchema = new mongoose.Schema({
  image: {
    type: String,
    required: true,
  },
  section: {
    type: String,
    enum: ["what_we_do", "events"],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("HomeGallery", homeGallerySchema);
