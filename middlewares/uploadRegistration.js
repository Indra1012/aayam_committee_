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
      allowed_formats: ["jpg", "jpeg", "png", "webp", "heic", "heif", "pdf", "doc", "docx"],
      // ✅ Auto-compress images on Cloudinary side
      transformation: isImage ? [{ quality: "auto", fetch_format: "auto" }] : undefined,
    };
  },
});

const uploadRegistration = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // ✅ 15MB limit — handles phone photos
}).any();

module.exports = (req, res, next) => {
  uploadRegistration(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      console.error("Multer error:", err.message);
      const subEventId = req.params.subEventId;
      // ✅ Specific error message for file size
      return res.redirect(subEventId ? `/register/${subEventId}?error=filesize` : "/events");
    } else if (err instanceof multer.MulterError) {
      console.error("Multer error:", err.message);
      const subEventId = req.params.subEventId;
      return res.redirect(subEventId ? `/register/${subEventId}?error=upload` : "/events");
    } else if (err) {
      console.error("Upload error:", err.message);
      const subEventId = req.params.subEventId;
      return res.redirect(subEventId ? `/register/${subEventId}?error=upload` : "/events");
    }
    next();
  });
};