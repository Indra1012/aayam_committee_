const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "aayam/team",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

const uploadTeam = multer({ storage });

module.exports = uploadTeam;