const Event = require("../models/Event");
const mongoose = require("mongoose");
const Review = require("../models/Review");
const SubEvent = require("../models/SubEvent");
const Registration = require("../models/Registration");


/* ===============================
   EVENTS LIST PAGE
================================ */
exports.getEventsPage = async (req, res) => {
  try {
    const today = new Date();

    // AUTO MOVE UPCOMING → PAST
    await Event.updateMany(
      { type: "upcoming", endDate: { $lt: today } },
      { $set: { type: "past" } }
    );

    const upcomingEvents = await Event.find({ type: "upcoming" })
      .sort({ startDate: 1 })
      .lean();

    const pastEvents = await Event.find({ type: "past" })
      .sort({ startDate: -1 })
      .lean();

    res.render("events/index", {
      upcomingEvents,
      pastEvents,
    });
  } catch (error) {
    console.error("Events Page Error:", error);
    res.redirect("/");
  }
};


/* ===============================
   EVENT DETAIL PAGE
================================ */
exports.getEventDetail = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect("/events");
    }

    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.redirect("/events");

    const isPast = event.type === "past";

    const reviews = isPast
      ? await Review.find({ event: event._id })
          .sort({ createdAt: -1 })
          .lean()
      : [];

    const subEvents = await SubEvent.find({ eventId: event._id }).lean();

    res.render("events/show", {
      event,
      isPast,
      reviews,
      subEvents,
    });
  } catch (error) {
    console.error("Event Detail Error:", error);
    res.redirect("/events");
  }
};


/* ===============================
   SUBEVENT SELECTION PAGE (NEW)
   Shows all sub-events for an event
   so the user can pick one to register
================================ */
exports.getSubEventsPage = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.eventId)) {
      return res.redirect("/events");
    }

    const event = await Event.findById(req.params.eventId).lean();
    if (!event) return res.redirect("/events");

    // Don't allow registration for past events
    if (event.type === "past") return res.redirect(`/events/${event._id}`);

    const subEvents = await SubEvent.find({ eventId: event._id }).lean();

    // Attach registration count to each sub-event
    for (let sub of subEvents) {
      sub.registrationCount = await Registration.countDocuments({
        subEventId: sub._id,
      });
    }

    res.render("events/subevents", { event, subEvents });
  } catch (error) {
    console.error("SubEvents Page Error:", error);
    res.redirect("/events");
  }
};


/* ===============================
   ADD EVENT (ADMIN)
================================ */
exports.addEvent = async (req, res) => {
  try {
    const {
      type,
      title,
      shortDescription,
      description,
      about,
      startDate,
      endDate,
    } = req.body;

    if (!title || !startDate || !endDate || !req.file) {
      return res.redirect("/events");
    }

    await Event.create({
      type,
      title,
      shortDescription,
      description,
      about,
      startDate,
      endDate,
      bannerImage: `/uploads/events/${req.file.filename}`,
    });

    res.redirect("/events");
  } catch (error) {
    console.error("Add Event Error:", error);
    res.redirect("/events");
  }
};


/* ===============================
   EDIT EVENT PAGE (ADMIN)
================================ */
exports.getEditEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.redirect("/events");

    const subEvents = await SubEvent.find({ eventId: event._id }).lean();

    res.render("events/edit", { event, subEvents });
  } catch (error) {
    console.error("Get Edit Event Error:", error);
    res.redirect("/events");
  }
};


/* ===============================
   UPDATE EVENT (ADMIN)
================================ */
exports.updateEvent = async (req, res) => {
  try {
    const {
      title,
      shortDescription,
      description,
      about,
      startDate,
      endDate,
    } = req.body;

    const updateData = {
      title,
      shortDescription,
      description,
      about,
      startDate,
      endDate,
    };

    if (req.file) {
      updateData.bannerImage = `/uploads/events/${req.file.filename}`;
    }

    await Event.findByIdAndUpdate(req.params.id, updateData);

    res.redirect(`/events/${req.params.id}`);
  } catch (error) {
    console.error("Update Event Error:", error);
    res.redirect("/events");
  }
};


/* ===============================
   DELETE EVENT (ADMIN)
================================ */
exports.deleteEvent = async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.redirect("/events");
  } catch (error) {
    console.error("Delete Event Error:", error);
    res.redirect("/events");
  }
};


/* ===============================
   MANUAL MOVE TO PAST (ADMIN)
================================ */
exports.moveEventToPast = async (req, res) => {
  try {
    await Event.findByIdAndUpdate(req.params.id, {
      type: "past",
    });

    res.redirect("/events");
  } catch (error) {
    console.error("Move Event Error:", error);
    res.redirect("/events");
  }
};


/* ===============================
   ADD REVIEW (PUBLIC – PAST EVENTS)
================================ */
exports.addReview = async (req, res) => {
  try {
    const { name, message } = req.body;
    const eventId = req.params.id;

    if (!name || !message) {
      return res.redirect(`/events/${eventId}`);
    }

    await Review.create({
      event: eventId,
      name,
      message,
    });

    res.redirect(`/events/${eventId}`);
  } catch (error) {
    console.error("Add Review Error:", error);
    res.redirect("/events");
  }
};


/* ===============================
   DELETE REVIEW (ADMIN)
================================ */
exports.deleteReview = async (req, res) => {
  try {
    const { reviewId, eventId } = req.params;
    await Review.findByIdAndDelete(reviewId);
    res.redirect(`/events/${eventId}`);
  } catch (error) {
    console.error("Delete Review Error:", error);
    res.redirect("/events");
  }
};


/* ===============================
   DELETE BANNER IMAGE
================================ */
exports.deleteBannerImage = async (req, res) => {
  try {
    await Event.findByIdAndUpdate(req.params.id, {
      bannerImage: null,
    });
    res.redirect(`/events/${req.params.id}`);
  } catch (error) {
    console.error("Delete Banner Error:", error);
    res.redirect("/events");
  }
};


/* ===============================
   ADD GALLERY IMAGES (ADMIN)
================================ */
exports.addGalleryImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.redirect(`/events/${req.params.id}`);
    }

    const images = req.files.map(
      (file) => `/uploads/events/${file.filename}`
    );

    await Event.findByIdAndUpdate(req.params.id, {
      $push: { galleryImages: { $each: images } },
    });

    res.redirect(`/events/${req.params.id}`);
  } catch (error) {
    console.error("Add Gallery Error:", error);
    res.redirect("/events");
  }
};


/* ===============================
   DELETE SINGLE GALLERY IMAGE (ADMIN)
================================ */
exports.deleteGalleryImage = async (req, res) => {
  try {
    const { eventId, index } = req.params;

    const event = await Event.findById(eventId);
    if (!event) return res.redirect("/events");

    event.galleryImages.splice(index, 1);
    await event.save();

    res.redirect(`/events/${eventId}`);
  } catch (error) {
    console.error("Delete Gallery Image Error:", error);
    res.redirect("/events");
  }
};


/* ===============================
   ADD COORDINATOR
================================ */
exports.addCoordinator = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.redirect(`/events/${req.params.id}`);
    }

    await Event.findByIdAndUpdate(req.params.id, {
      $push: { conductedBy: { name, email } },
    });

    res.redirect(`/events/${req.params.id}`);
  } catch (error) {
    console.error("Add Coordinator Error:", error);
    res.redirect("/events");
  }
};


/* ===============================
   DELETE COORDINATOR
================================ */
exports.deleteCoordinator = async (req, res) => {
  try {
    const { eventId, index } = req.params;

    const event = await Event.findById(eventId);
    if (!event) return res.redirect("/events");

    event.conductedBy.splice(index, 1);
    await event.save();

    res.redirect(`/events/${eventId}`);
  } catch (error) {
    console.error("Delete Coordinator Error:", error);
    res.redirect("/events");
  }
};


/* ===============================
   ADD DOCUMENT
================================ */
exports.addDocument = async (req, res) => {
  try {
    const { title, isPublic } = req.body;

    if (!req.file || !title) {
      return res.redirect(`/events/${req.params.id}`);
    }

    await Event.findByIdAndUpdate(req.params.id, {
      $push: {
        documents: {
          title,
          file: `/uploads/events/${req.file.filename}`,
          isPublic: isPublic === "on",
        },
      },
    });

    res.redirect(`/events/${req.params.id}`);
  } catch (error) {
    console.error("Add Document Error:", error);
    res.redirect("/events");
  }
};


/* ===============================
   DELETE DOCUMENT
================================ */
exports.deleteDocument = async (req, res) => {
  try {
    const { eventId, index } = req.params;

    const event = await Event.findById(eventId);
    if (!event) return res.redirect("/events");

    event.documents.splice(index, 1);
    await event.save();

    res.redirect(`/events/${eventId}`);
  } catch (error) {
    console.error("Delete Document Error:", error);
    res.redirect("/events");
  }
};


/* =================================
   SUBEVENT CRUD (ADMIN)
================================= */

// Create SubEvent
exports.createSubEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const {
      title,
      description,
      maxParticipants,
      isGroupEvent,
      minTeamSize,
      maxTeamSize,
    } = req.body;

    const qrImage = req.file
      ? `/uploads/events/${req.file.filename}`
      : null;

    await SubEvent.create({
      title,
      description,
      eventId,
      maxParticipants: maxParticipants || null,
      isGroupEvent: isGroupEvent === "true",
      minTeamSize: minTeamSize || 1,
      maxTeamSize: maxTeamSize || 1,
      enableTeamMembers: false,
      requirePaymentScreenshot: false,
      qrImage,
    });

    res.redirect(`/events/${eventId}`);
  } catch (error) {
    console.error("Create SubEvent Error:", error);
    res.redirect("/events");
  }
};


// Update SubEvent
exports.updateSubEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const updateData = {
      title: req.body.title,
      description: req.body.description,
      maxParticipants: req.body.maxParticipants || null,
      isGroupEvent: req.body.isGroupEvent === "true",
      minTeamSize: req.body.minTeamSize || 1,
      maxTeamSize: req.body.maxTeamSize || 1,
      enableTeamMembers: req.body.enableTeamMembers === "on",
      requirePaymentScreenshot: req.body.requirePaymentScreenshot === "on",
    };

    if (req.file) {
      updateData.qrImage = `/uploads/events/${req.file.filename}`;
    }

    const updated = await SubEvent.findByIdAndUpdate(id, updateData, { new: true });
    res.redirect(`/events/edit/${updated.eventId}`);
  } catch (error) {
    console.error("Update SubEvent Error:", error);
    res.redirect("/events");
  }
};


// Delete SubEvent
exports.deleteSubEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const subEvent = await SubEvent.findById(id).lean();
    const eventId = subEvent ? subEvent.eventId : null;
    await SubEvent.findByIdAndDelete(id);
    await Registration.deleteMany({ subEventId: id });
    res.redirect(eventId ? `/events/edit/${eventId}` : "/events");
  } catch (error) {
    console.error("Delete SubEvent Error:", error);
    res.redirect("/events");
  }
};


/* =================================
   FORM BUILDER (DYNAMIC FIELDS)
================================= */

// Add new custom field to SubEvent
exports.addFormField = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, type, options, required, placeholder } = req.body;

    const subEvent = await SubEvent.findById(id);
    if (!subEvent) return res.redirect("/events");

    const newField = {
      label,
      type,
      required: required === "on",
      placeholder: placeholder || "",
      options:
        type === "dropdown" || type === "checkbox"
          ? options
            ? options.split(",").map((opt) => opt.trim())
            : []
          : [],
      order: subEvent.formFields.length,
    };

    subEvent.formFields.push(newField);
    await subEvent.save();

    res.redirect(`/events/edit/${subEvent.eventId}`);
  } catch (error) {
    console.error("Add Form Field Error:", error);
    res.redirect("/events");
  }
};


// Update existing form field
exports.updateFormField = async (req, res) => {
  try {
    const { id, fieldId } = req.params;
    const { label, type, options, required, placeholder } = req.body;

    const subEvent = await SubEvent.findById(id);
    if (!subEvent) return res.redirect("/events");

    const field = subEvent.formFields.id(fieldId);
    if (!field) return res.redirect(`/events/edit/${subEvent.eventId}`);

    field.label = label;
    field.type = type;
    field.required = required === "on";
    field.placeholder = placeholder || "";
    field.options =
      type === "dropdown" || type === "checkbox"
        ? options
          ? options.split(",").map((opt) => opt.trim())
          : []
        : [];

    await subEvent.save();

    res.redirect(`/events/edit/${subEvent.eventId}`);
  } catch (error) {
    console.error("Update Form Field Error:", error);
    res.redirect("/events");
  }
};


// Delete custom field
exports.deleteFormField = async (req, res) => {
  try {
    const { id, fieldId } = req.params;

    const subEvent = await SubEvent.findById(id);
    if (!subEvent) return res.redirect("/events");

    subEvent.formFields = subEvent.formFields.filter(
      (field) => field._id.toString() !== fieldId
    );

    await subEvent.save();

    res.redirect(`/events/edit/${subEvent.eventId}`);
  } catch (error) {
    console.error("Delete Form Field Error:", error);
    res.redirect("/events");
  }
};


/* =================================
   USER REGISTRATION
================================= */

// Show Registration Form
exports.showRegistrationForm = async (req, res) => {
  try {
    const { subEventId } = req.params;

    const subEvent = await SubEvent.findById(subEventId)
      .populate("eventId")
      .lean();

    if (!subEvent) return res.redirect("/events");

    // Block registration if event is past
    if (subEvent.eventId && subEvent.eventId.type === "past") {
      return res.redirect(`/events/${subEvent.eventId._id}`);
    }

    const registrationCount = await Registration.countDocuments({ subEventId });
    subEvent.registrationCount = registrationCount;

    res.render("events/register", { subEvent });
  } catch (error) {
    console.error("Show Registration Form Error:", error);
    res.redirect("/events");
  }
};


// =============================================
// SUBMIT REGISTRATION
// =============================================
exports.submitRegistration = async (req, res) => {
  try {
    const { subEventId } = req.params;

    const subEvent = await SubEvent.findById(subEventId).lean();
    if (!subEvent) return res.redirect("/events");

    // ── Check capacity ──
    if (subEvent.maxParticipants) {
      const count = await Registration.countDocuments({ subEventId });
      if (count >= subEvent.maxParticipants) {
        return res.redirect(`/register/${subEventId}?error=full`);
      }
    }

    // ── Build a map of uploaded files by field name ──
    // req.files is an array from multer .any()
    // e.g. [{ fieldname: 'paymentScreenshot', filename: '...' }, ...]
    const uploadedFiles = {};
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        uploadedFiles[file.fieldname] = file;
      });
    }

    // ── Parse dynamic form responses ──
    const responses = [];

    if (req.body.responses) {
      for (const [fieldId, value] of Object.entries(req.body.responses)) {
        if (!mongoose.Types.ObjectId.isValid(fieldId)) continue;

        // Check if this field had a file uploaded
        // File fields are named: responses[fieldId]
        const fileKey = `responses[${fieldId}]`;
        const uploadedFile = uploadedFiles[fileKey];

        responses.push({
          fieldId: new mongoose.Types.ObjectId(fieldId),
          value: uploadedFile
            ? `/uploads/registrations/${uploadedFile.filename}`
            : Array.isArray(value) ? value : value,
        });
      }
    }

    // Also catch file fields that weren't in req.body.responses
    // (browser may not send empty file fields in body)
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        // Skip paymentScreenshot — handled separately below
        if (file.fieldname === "paymentScreenshot") return;

        // Extract fieldId from fieldname like "responses[abc123]"
        const match = file.fieldname.match(/^responses\[(.+)\]$/);
        if (!match) return;

        const fieldId = match[1];
        if (!mongoose.Types.ObjectId.isValid(fieldId)) return;

        // Only add if not already added above
        const alreadyAdded = responses.find(
          (r) => r.fieldId.toString() === fieldId
        );
        if (!alreadyAdded) {
          responses.push({
            fieldId: new mongoose.Types.ObjectId(fieldId),
            value: `/uploads/registrations/${file.filename}`,
          });
        }
      });
    }

    // ── Validate required fields ──
    for (const field of subEvent.formFields) {
      if (!field.required) continue;

      const found = responses.find(
        (r) => r.fieldId.toString() === field._id.toString()
      );

      if (!found || found.value === null || found.value === undefined ||
          found.value === "" || (Array.isArray(found.value) && found.value.length === 0)) {
        return res.redirect(`/register/${subEventId}?error=required`);
      }
    }

    // ── Parse team members ──
    let teamMembers = [];
    if (subEvent.enableTeamMembers && req.body.teamMembers) {
      teamMembers = Array.isArray(req.body.teamMembers)
        ? req.body.teamMembers.filter((m) => m.trim() !== "")
        : [req.body.teamMembers].filter((m) => m.trim() !== "");
    }

    // ── Payment screenshot ──
    // Now pulled from uploadedFiles map instead of req.file
    let paymentScreenshot = null;
    if (subEvent.requirePaymentScreenshot) {
      const screenshotFile = uploadedFiles["paymentScreenshot"];
      if (!screenshotFile) {
        return res.redirect(`/register/${subEventId}?error=payment`);
      }
      paymentScreenshot = `/uploads/registrations/${screenshotFile.filename}`;
    }

    // ── Save registration ──
    await Registration.create({
      subEventId,
      responses,
      teamMembers,
      paymentScreenshot,
      status: "pending", // always starts pending, admin manually verifies
    });

    res.redirect(`/register/${subEventId}/success`);
  } catch (error) {
    console.error("Submit Registration Error:", error);
    res.redirect("/events");
  }
};


// Registration Success Page
exports.registrationSuccess = async (req, res) => {
  try {
    const { subEventId } = req.params;

    const subEvent = await SubEvent.findById(subEventId)
      .populate("eventId")
      .lean();

    if (!subEvent) return res.redirect("/events");

    res.render("events/register-success", { subEvent });
  } catch (error) {
    console.error("Registration Success Error:", error);
    res.redirect("/events");
  }
};


/* =================================
   ADMIN REGISTRATION MANAGEMENT
================================= */

// List registrations of a subevent
exports.getRegistrationsForSubEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const subEvent = await SubEvent.findById(id).lean();
    if (!subEvent) return res.redirect("/events");

    const registrations = await Registration.find({ subEventId: id })
      .sort({ createdAt: -1 })
      .lean();

    res.render("admin/registrations", { subEvent, registrations });
  } catch (error) {
    console.error("Get Registrations Error:", error);
    res.redirect("/events");
  }
};


// Verify registration
exports.verifyRegistration = async (req, res) => {
  try {
    const reg = await Registration.findByIdAndUpdate(
      req.params.id,
      { status: "verified" },
      { new: true }
    );
    res.redirect(`/admin/subevents/${reg.subEventId}/registrations`);
  } catch (error) {
    console.error("Verify Registration Error:", error);
    res.redirect("/events");
  }
};


// Move registration back to pending
exports.pendingRegistration = async (req, res) => {
  try {
    const reg = await Registration.findByIdAndUpdate(
      req.params.id,
      { status: "pending" },
      { new: true }
    );
    res.redirect(`/admin/subevents/${reg.subEventId}/registrations`);
  } catch (error) {
    console.error("Pending Registration Error:", error);
    res.redirect("/events");
  }
};


// Reject registration
exports.rejectRegistration = async (req, res) => {
  try {
    const reg = await Registration.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    );
    res.redirect(`/admin/subevents/${reg.subEventId}/registrations`);
  } catch (error) {
    console.error("Reject Registration Error:", error);
    res.redirect("/events");
  }
};


// Delete registration (admin)
exports.deleteRegistration = async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.id).lean();
    const subEventId = reg ? reg.subEventId : null;
    await Registration.findByIdAndDelete(req.params.id);
    res.redirect(
      subEventId
        ? `/admin/subevents/${subEventId}/registrations`
        : "/events"
    );
  } catch (error) {
    console.error("Delete Registration Error:", error);
    res.redirect("/events");
  }
};


// Export registrations as CSV
exports.exportRegistrationsCSV = async (req, res) => {
  try {
    const { id } = req.params; // subEventId

    const subEvent = await SubEvent.findById(id).lean();
    if (!subEvent) return res.redirect("/events");

    const registrations = await Registration.find({ subEventId: id })
      .sort({ createdAt: -1 })
      .lean();

    // Build CSV headers from form fields
    const fieldHeaders = subEvent.formFields
      .sort((a, b) => a.order - b.order)
      .map((f) => `"${f.label}"`);

    const headers = [
      "#",
      ...fieldHeaders,
      ...(subEvent.enableTeamMembers ? ['"Team Members"'] : []),
      '"Status"',
      '"Registered At"',
    ].join(",");

    // Build rows
    const rows = registrations.map((reg, i) => {
      const fieldValues = subEvent.formFields
        .sort((a, b) => a.order - b.order)
        .map((field) => {
          const resp = reg.responses.find(
            (r) => r.fieldId.toString() === field._id.toString()
          );
          if (!resp) return '""';
          const val = Array.isArray(resp.value)
            ? resp.value.join("; ")
            : resp.value;
          // Escape quotes in CSV
          return `"${String(val).replace(/"/g, '""')}"`;
        });

      const teamCol = subEvent.enableTeamMembers
        ? [`"${(reg.teamMembers || []).join("; ")}"`]
        : [];

      return [
        i + 1,
        ...fieldValues,
        ...teamCol,
        `"${reg.status}"`,
        `"${new Date(reg.createdAt).toLocaleString()}"`,
      ].join(",");
    });

    const csv = [headers, ...rows].join("\n");

    const filename = `${subEvent.title.replace(/\s+/g, "_")}_registrations.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    res.send(csv);
  } catch (error) {
    console.error("Export CSV Error:", error);
    res.redirect("/events");
  }
};


/* =================================
   HELPER
================================= */
exports.getSubEventsByEvent = async (eventId) => {
  return await SubEvent.find({ eventId }).lean();
};