const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const mimeLower = file.mimetype.toLowerCase();
    const isImage = /jpeg|jpg|png|webp|heic|heif/.test(mimeLower);

    return {
      folder: "aayam/registrations",
      resource_type: isImage ? "image" : "raw",
      // ✅ Added heic and heif for iPhone photos
      allowed_formats: ["jpg", "jpeg", "png", "webp", "heic", "heif", "pdf", "doc", "docx"],
    };
  },
});

const uploadRegistration = multer({ storage }).any();

module.exports = (req, res, next) => {
  uploadRegistration(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error("Multer error:", err.message);
      // ✅ Redirect to the actual page instead of "back"
      const subEventId = req.params.subEventId;
      return res.redirect(subEventId ? `/register/${subEventId}?error=upload` : "/events");
    } else if (err) {
      console.error("Upload error:", err.message);
      // ✅ Same fix here — no more /register/back crash
      const subEventId = req.params.subEventId;
      return res.redirect(subEventId ? `/register/${subEventId}?error=upload` : "/events");
    }
    next();
  });
};