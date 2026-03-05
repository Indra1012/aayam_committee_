const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

// ─── Images (banner, gallery, qr, poster) ────────────────────────────────────
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "aayam/events",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

const imageFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error("Images only"), false);
};

// ─── Documents ────────────────────────────────────────────────────────────────
const docMemoryStorage = multer.memoryStorage();

const docFilter = (req, file, cb) => {
  const allowed = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
    "application/vnd.oasis.opendocument.text",
    "application/vnd.oasis.opendocument.spreadsheet",
    "application/vnd.oasis.opendocument.presentation",
  ];
  allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error(`File type not allowed`), false);
};

// Manual Cloudinary upload for documents
const uploadDocToCloud = (buffer, originalname) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "aayam/event-documents",
        resource_type: "raw",
        public_id: Date.now() + "-" + originalname.replace(/\s+/g, "_"),
        format: "",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
};

const uploadImage = multer({ storage: imageStorage, fileFilter: imageFilter });
const uploadDoc   = multer({ storage: docMemoryStorage, fileFilter: docFilter });

// Multi-field uploader for subevents (qrImage + posterImage)
const uploadSubEventImages = multer({ storage: imageStorage, fileFilter: imageFilter }).fields([
  { name: "qrImage",     maxCount: 1 },
  { name: "posterImage", maxCount: 1 },
]);

module.exports = { uploadImage, uploadDoc, uploadDocToCloud, uploadSubEventImages };