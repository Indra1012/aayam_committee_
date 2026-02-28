const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

// Cloudinary storage — files go to aayam/registrations folder
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    // Allow images AND documents (pdf, doc, docx)
    const isImage = /jpeg|jpg|png|webp/.test(
      file.mimetype.toLowerCase()
    );

    return {
      folder: "aayam/registrations",
      // For non-image files, use "raw" resource type
      resource_type: isImage ? "image" : "raw",
      allowed_formats: ["jpg", "jpeg", "png", "webp", "pdf", "doc", "docx"],
    };
  },
});

// Use .any() so Multer accepts:
//   - paymentScreenshot (single image)
//   - responses[fieldId] (custom file fields)
//   - any other file fields without crashing
const uploadRegistration = multer({ storage }).any();

// Wrap in middleware for clean error handling
module.exports = (req, res, next) => {
  uploadRegistration(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error("Multer error:", err.message);
      return res.redirect("back");
    } else if (err) {
      console.error("Upload error:", err.message);
      return res.redirect("back");
    }
    next();
  });
};