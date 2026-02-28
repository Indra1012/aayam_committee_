const express = require("express");
const router = express.Router();

const eventController = require("../controllers/eventController");
const { isAdmin } = require("../middlewares/authMiddleware");
const { uploadImage, uploadDoc } = require("../middlewares/uploadEvent"); // ← named imports
const uploadRegistration = require("../middlewares/uploadRegistration");


/* ===============================
   PUBLIC ROUTES
================================ */

router.get("/events", eventController.getEventsPage);

// NOTE: specific routes like /events/edit/:id must come BEFORE /events/:id
router.get("/events/edit/:id", isAdmin, eventController.getEditEvent);

router.get("/events/:id", eventController.getEventDetail);


/* ===============================
   REVIEWS (PAST EVENTS)
================================ */

router.post("/events/:id/reviews", eventController.addReview);

router.post(
  "/events/:eventId/reviews/:reviewId/delete",
  isAdmin,
  eventController.deleteReview
);


/* ===============================
   ADMIN ROUTES (CRUD)
================================ */

router.post(
  "/events/add",
  isAdmin,
  uploadImage.single("bannerImage"),   // ← image
  eventController.addEvent
);

router.post(
  "/events/edit/:id",
  isAdmin,
  uploadImage.single("bannerImage"),   // ← image
  eventController.updateEvent
);

router.post("/events/delete/:id", isAdmin, eventController.deleteEvent);

router.post(
  "/events/move-to-past/:id",
  isAdmin,
  eventController.moveEventToPast
);

router.post(
  "/events/:id/gallery",
  isAdmin,
  uploadImage.array("galleryImages", 15),  // ← image
  eventController.addGalleryImages
);

router.post(
  "/events/:eventId/gallery/:index/delete",
  isAdmin,
  eventController.deleteGalleryImage
);

router.post(
  "/events/:id/banner/delete",
  isAdmin,
  eventController.deleteBannerImage
);

router.post(
  "/events/:id/conducted-by",
  isAdmin,
  eventController.addCoordinator
);

router.post(
  "/events/:eventId/conducted-by/:index/delete",
  isAdmin,
  eventController.deleteCoordinator
);

router.post(
  "/events/:id/documents",
  isAdmin,
  uploadDoc.single("document"),        // ← document (pdf/doc/docx)
  eventController.addDocument
);

router.post(
  "/events/:eventId/documents/:index/delete",
  isAdmin,
  eventController.deleteDocument
);


/* ===============================
   SUBEVENT CRUD (ADMIN ONLY)
================================ */

router.post(
  "/events/:eventId/subevents/add",
  isAdmin,
  uploadImage.single("qrImage"),       // ← image
  eventController.createSubEvent
);

router.post(
  "/subevents/:id/edit",
  isAdmin,
  uploadImage.single("qrImage"),       // ← image
  eventController.updateSubEvent
);

router.post("/subevents/:id/delete", isAdmin, eventController.deleteSubEvent);


/* ===============================
   SUBEVENT FORM BUILDER (ADMIN)
================================ */

router.post(
  "/subevents/:id/fields/add",
  isAdmin,
  eventController.addFormField
);

router.post(
  "/subevents/:id/fields/:fieldId/edit",
  isAdmin,
  eventController.updateFormField
);

router.post(
  "/subevents/:id/fields/:fieldId/delete",
  isAdmin,
  eventController.deleteFormField
);


/* ===============================
   USER REGISTRATION
================================ */

router.get(
  "/events/:eventId/register",
  eventController.getSubEventsPage
);

router.get("/register/:subEventId", eventController.showRegistrationForm);

router.post(
  "/register/:subEventId",
  uploadRegistration,
  eventController.submitRegistration
);

router.get(
  "/register/:subEventId/success",
  eventController.registrationSuccess
);


/* ===============================
   ADMIN REGISTRATION MANAGEMENT
================================ */

router.get(
  "/admin/subevents/:id/registrations",
  isAdmin,
  eventController.getRegistrationsForSubEvent
);

router.post(
  "/registrations/:id/verify",
  isAdmin,
  eventController.verifyRegistration
);

router.post(
  "/registrations/:id/pending",
  isAdmin,
  eventController.pendingRegistration
);

router.post(
  "/registrations/:id/reject",
  isAdmin,
  eventController.rejectRegistration
);

router.post(
  "/registrations/:id/delete",
  isAdmin,
  eventController.deleteRegistration
);

router.get(
  "/admin/subevents/:id/registrations/export",
  isAdmin,
  eventController.exportRegistrationsCSV
);


module.exports = router;