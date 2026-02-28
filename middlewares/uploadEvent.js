const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

// ─── Images (banner, gallery, qr) ───────────────────────────────────────────
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

// ─── Documents — use memoryStorage + manual Cloudinary upload ───────────────
// CloudinaryStorage does NOT reliably support resource_type:"raw" in all versions
// So we store in memory and upload manually in the controller via uploadDocToCloud()
const docMemoryStorage = multer.memoryStorage();

const docFilter = (req, file, cb) => {
  const allowed = [
    // PDF
    "application/pdf",

    // Word
    "application/msword",                                                                   // .doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",             // .docx

    // Excel
    "application/vnd.ms-excel",                                                            // .xls
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",                  // .xlsx

    // PowerPoint
    "application/vnd.ms-powerpoint",                                                       // .ppt
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",          // .pptx

    // Google Docs exported formats (when downloaded, they become above types)
    // Plain text & others
    "text/plain",                                                                           // .txt
    "text/csv",                                                                             // .csv

    // OpenDocument (LibreOffice)
    "application/vnd.oasis.opendocument.text",                                             // .odt
    "application/vnd.oasis.opendocument.spreadsheet",                                      // .ods
    "application/vnd.oasis.opendocument.presentation",                                     // .odp
  ];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type "${file.mimetype}" not allowed. Supported: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV, ODT`), false);
  }
};

// Call this inside addDocument controller to upload buffer → Cloudinary
const uploadDocToCloud = (buffer, originalname) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "aayam/event-documents",
        resource_type: "raw",
        public_id: Date.now() + "-" + originalname.replace(/\s+/g, "_"),
        format: "",   // keep original extension
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

module.exports = { uploadImage, uploadDoc, uploadDocToCloud };