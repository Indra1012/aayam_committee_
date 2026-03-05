const express = require("express");
const router = express.Router();

const eventController = require("../controllers/eventController");
const { isAdmin } = require("../middlewares/authMiddleware");
const { uploadImage, uploadDoc, uploadSubEventImages } = require("../middlewares/uploadEvent");
const uploadRegistration = require("../middlewares/uploadRegistration");

/* ===============================
   PUBLIC ROUTES
================================ */
router.get("/events", eventController.getEventsPage);
router.get("/events/edit/:id", isAdmin, eventController.getEditEvent);
router.get("/events/:id", eventController.getEventDetail);

/* ===============================
   REVIEWS
================================ */
router.post("/events/:id/reviews", eventController.addReview);
router.post("/events/:eventId/reviews/:reviewId/delete", isAdmin, eventController.deleteReview);

/* ===============================
   ADMIN EVENT CRUD
================================ */
router.post("/events/add",  isAdmin, uploadImage.single("bannerImage"), eventController.addEvent);
router.post("/events/edit/:id", isAdmin, uploadImage.single("bannerImage"), eventController.updateEvent);
router.post("/events/delete/:id", isAdmin, eventController.deleteEvent);
router.post("/events/move-to-past/:id", isAdmin, eventController.moveEventToPast);
router.post("/events/toggle-visibility/:id", isAdmin, eventController.toggleEventVisibility);

/* ===============================
   GALLERY (with speaker + detail)
================================ */
router.post(
  "/events/:id/gallery",
  isAdmin,
  uploadImage.array("galleryImages", 15),
  eventController.addGalleryImages
);
router.post("/events/:eventId/gallery/:imageId/meta",  isAdmin, eventController.updateGalleryImageMeta);
router.post("/events/:eventId/gallery/:imageId/delete", isAdmin, eventController.deleteGalleryImage);
router.post("/events/:id/banner/delete", isAdmin, eventController.deleteBannerImage);

/* ===============================
   COORDINATORS & DOCUMENTS
================================ */
router.post("/events/:id/conducted-by", isAdmin, eventController.addCoordinator);
router.post("/events/:eventId/conducted-by/:index/delete", isAdmin, eventController.deleteCoordinator);
router.post("/events/:id/documents", isAdmin, uploadDoc.single("document"), eventController.addDocument);
router.post("/events/:eventId/documents/:index/delete", isAdmin, eventController.deleteDocument);

/* ===============================
   SUBEVENT CRUD
================================ */
router.post(
  "/events/:eventId/subevents/add",
  isAdmin,
  uploadSubEventImages,
  eventController.createSubEvent
);
router.post(
  "/subevents/:id/edit",
  isAdmin,
  uploadSubEventImages,
  eventController.updateSubEvent
);
router.post("/subevents/:id/delete", isAdmin, eventController.deleteSubEvent);

/* ===============================
   FORM BUILDER
================================ */
router.post("/subevents/:id/fields/add",              isAdmin, eventController.addFormField);
router.post("/subevents/:id/fields/:fieldId/edit",    isAdmin, eventController.updateFormField);
router.post("/subevents/:id/fields/:fieldId/delete",  isAdmin, eventController.deleteFormField);

/* ===============================
   USER REGISTRATION
================================ */
router.get("/events/:eventId/register", eventController.getSubEventsPage);
router.get("/register/:subEventId",     eventController.showRegistrationForm);
router.post("/register/:subEventId",    uploadRegistration, eventController.submitRegistration);
router.get("/register/:subEventId/success", eventController.registrationSuccess);

/* ===============================
   ADMIN REGISTRATION MANAGEMENT
================================ */
router.get( "/admin/subevents/:id/registrations",        isAdmin, eventController.getRegistrationsForSubEvent);
router.post("/registrations/:id/verify",                  isAdmin, eventController.verifyRegistration);
router.post("/registrations/:id/pending",                 isAdmin, eventController.pendingRegistration);
router.post("/registrations/:id/reject",                  isAdmin, eventController.rejectRegistration);
router.post("/registrations/:id/delete",                  isAdmin, eventController.deleteRegistration);
router.get( "/admin/subevents/:id/registrations/export",  isAdmin, eventController.exportRegistrationsCSV);

module.exports = router;