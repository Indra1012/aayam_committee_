const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Path: uploads/registrations
const uploadPath = path.join(__dirname, "..", "uploads", "registrations");

// Create folder if not exists
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Storage config
const storage = multer.diskStorage({
  destination: uploadPath,
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + file.originalname.replace(/\s+/g, "-");
    cb(null, uniqueName);
  },
});

// File filter (only images allowed)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|pdf|doc|docx/;
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only image/document files are allowed"), false);
  }
};

// ✅ Use .any() so Multer accepts:
//    - paymentScreenshot (single image)
//    - responses[fieldId] (custom file fields)
//    - any other file fields without crashing
const uploadRegistration = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
}).any();

// Wrap in a middleware function for cleaner error handling
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