const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 🔴 ABSOLUTE ROOT PATH
const ROOT_DIR = process.cwd();
const uploadDir = path.join(ROOT_DIR, "uploads", "home");

console.log("🔍 ROOT DIR:", ROOT_DIR);
console.log("🔍 UPLOAD DIR:", uploadDir);

// 🔴 FORCE CREATE DIRECTORY
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log("✅ Upload directory created");
  } else {
    console.log("✅ Upload directory already exists");
  }
} catch (err) {
  console.error("❌ Failed to create upload directory", err);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log("📂 Saving file to:", uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const filename = Date.now() + path.extname(file.originalname);
    console.log("📝 Filename:", filename);
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpg|jpeg|png/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);

  if (ext && mime) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, JPEG, PNG allowed"));
  }
};

module.exports = multer({
  storage,
  fileFilter,
});
