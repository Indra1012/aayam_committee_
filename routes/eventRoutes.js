const express = require("express");
const router = express.Router();

const eventController = require("../controllers/eventController");
const { isAdmin } = require("../middlewares/authMiddleware");
const uploadEvent = require("../middlewares/uploadEvent");
const uploadRegistration = require("../middlewares/uploadRegistration");


/* ===============================
   PUBLIC ROUTES
================================ */

// Events listing page
router.get("/events", eventController.getEventsPage);

// Event detail page
// NOTE: specific routes like /events/edit/:id must come BEFORE /events/:id
router.get("/events/edit/:id", isAdmin, eventController.getEditEvent);

// Event detail page
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
  uploadEvent.single("bannerImage"),
  eventController.addEvent
);

router.post(
  "/events/edit/:id",
  isAdmin,
  uploadEvent.single("bannerImage"),
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
  uploadEvent.array("galleryImages", 15),
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
  uploadEvent.single("document"),
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
  uploadEvent.single("qrImage"),
  eventController.createSubEvent
);

router.post(
  "/subevents/:id/edit",
  isAdmin,
  uploadEvent.single("qrImage"),
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

// NEW: Subevent selection page — user picks which sub-event to register for
router.get(
  "/events/:eventId/register",
  eventController.getSubEventsPage
);

// Show registration form for a specific sub-event
router.get("/register/:subEventId", eventController.showRegistrationForm);

// Submit registration form
// uploadRegistration is now a plain middleware (wraps multer .any())
router.post(
  "/register/:subEventId",
  uploadRegistration,
  eventController.submitRegistration
);

// Registration success page
router.get(
  "/register/:subEventId/success",
  eventController.registrationSuccess
);


/* ===============================
   ADMIN REGISTRATION MANAGEMENT
================================ */

// View all registrations for a sub-event
router.get(
  "/admin/subevents/:id/registrations",
  isAdmin,
  eventController.getRegistrationsForSubEvent
);

// Verify registration
router.post(
  "/registrations/:id/verify",
  isAdmin,
  eventController.verifyRegistration
);

// Move back to pending
router.post(
  "/registrations/:id/pending",
  isAdmin,
  eventController.pendingRegistration
);

// Reject registration
router.post(
  "/registrations/:id/reject",
  isAdmin,
  eventController.rejectRegistration
);

// Delete registration
router.post(
  "/registrations/:id/delete",
  isAdmin,
  eventController.deleteRegistration
);

// Export registrations as CSV
router.get(
  "/admin/subevents/:id/registrations/export",
  isAdmin,
  eventController.exportRegistrationsCSV
);


module.exports = router;