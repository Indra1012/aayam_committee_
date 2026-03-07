const Event = require("../models/Event");
const mongoose = require("mongoose");
const Review = require("../models/Review");
const SubEvent = require("../models/SubEvent");
const Registration = require("../models/Registration");
const { uploadDocToCloud } = require("../middlewares/uploadEvent");


/* ── helpers ── */
function parseTime12(str) {
  if (!str) return "";
  return str.trim();
}

/* ── Helper: convert "09:30 AM" / "12:00 PM" etc. → total minutes (0–1439) for sorting ── */
function timeToMinutes(str) {
  if (!str || str.trim() === "") return 9999; // no time → push to end
  const match = str.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 9999;
  let hours   = parseInt(match[1], 10);
  const mins  = parseInt(match[2], 10);
  const ampm  = match[3].toUpperCase();
  if (ampm === "AM") {
    if (hours === 12) hours = 0;          // 12:xx AM → 0 hrs
  } else {
    if (hours !== 12) hours += 12;        // 1–11 PM  → add 12
  }
  return hours * 60 + mins;
}

/* ── Helper: fix image URL (handle old local paths) ── */
function fixImageUrl(url) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (!url.startsWith("/")) return "/" + url;
  return url;
}

/* ── Helper: group & sort subEvents by dayNumber then by startTime ── */
function groupSubEventsByDay(subEvents) {
  // Sort: primary = dayNumber (nulls last), secondary = startTime minutes
  const sorted = [...subEvents].sort((a, b) => {
    const dayA = a.dayNumber != null ? a.dayNumber : Infinity;
    const dayB = b.dayNumber != null ? b.dayNumber : Infinity;
    if (dayA !== dayB) return dayA - dayB;
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });

  const dayMap = {};
  for (const sub of sorted) {
    const key = sub.dayNumber || 0;
    if (!dayMap[key]) dayMap[key] = [];
    dayMap[key].push(sub);
  }

  return Object.keys(dayMap)
    .sort((a, b) => Number(a) - Number(b))
    .map(k => ({ day: Number(k), subEvents: dayMap[k] }));
}


/* ===============================
   EVENTS LIST PAGE
================================ */
exports.getEventsPage = async (req, res) => {
  try {
    const today = new Date();
    await Event.updateMany(
      { type: "upcoming", endDate: { $lt: today } },
      { $set: { type: "past" } }
    );

    // ── ONE-TIME MIGRATION: fix legacy events with null/missing isPublic ──
    await Event.updateMany(
      { isPublic: { $exists: false } },
      { $set: { isPublic: true } }
    );
    await Event.updateMany(
      { isPublic: null },
      { $set: { isPublic: true } }
    );

    const upcomingEvents = await Event.find({ type: "upcoming" }).sort({ startDate: 1 }).lean();
    const pastEvents     = await Event.find({ type: "past" }).sort({ startDate: -1 }).lean();

    upcomingEvents.forEach(e => { e.bannerImage = fixImageUrl(e.bannerImage); });
    pastEvents.forEach(e => { e.bannerImage = fixImageUrl(e.bannerImage); });

    res.render("events/index", { upcomingEvents, pastEvents });
  } catch (error) {
    console.error("Events Page Error:", error.message);
    res.redirect("/");
  }
};


/* ===============================
   EVENT DETAIL PAGE
================================ */
exports.getEventDetail = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.redirect("/events");

    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.redirect("/events");

    event.bannerImage = fixImageUrl(event.bannerImage);

    if (event.galleryImages && event.galleryImages.length > 0) {
      event.galleryImages = event.galleryImages.map(img => ({
        ...img,
        url: fixImageUrl(img.url),
      }));
    }

    const isPast  = event.type === "past";
    const isAdmin = req.user && (req.user.role === "admin" || req.user.role === "superadmin");

    if (event.isPublic === false && !isAdmin) {
      return res.render("events/private", { event });
    }

    const reviews = isPast
      ? await Review.find({ event: event._id }).sort({ createdAt: -1 }).lean()
      : [];

    // Fetch all subevents, then sort by dayNumber + startTime in JS
    const subEventsRaw = await SubEvent.find({ eventId: event._id }).lean();
    const subEvents = [...subEventsRaw].sort((a, b) => {
      const dayA = a.dayNumber != null ? a.dayNumber : Infinity;
      const dayB = b.dayNumber != null ? b.dayNumber : Infinity;
      if (dayA !== dayB) return dayA - dayB;
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });

    const groupedSubEvents = groupSubEventsByDay(subEvents);

    res.render("events/show", { event, isPast, reviews, subEvents, groupedSubEvents });
  } catch (error) {
    console.error("Event Detail Error:", error.message);
    res.redirect("/events");
  }
};


/* ===============================
   SUBEVENT SELECTION PAGE
================================ */
exports.getSubEventsPage = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.eventId)) return res.redirect("/events");

    const event = await Event.findById(req.params.eventId).lean();
    if (!event) return res.redirect("/events");
    if (event.type === "past") return res.redirect(`/events/${event._id}`);

    // Fetch raw, enrich with registrationCount + fix image URLs
    const subEventsRaw = await SubEvent.find({ eventId: event._id }).lean();

    for (let sub of subEventsRaw) {
      sub.registrationCount = await Registration.countDocuments({ subEventId: sub._id });
      if (sub.qrImage)     sub.qrImage     = fixImageUrl(sub.qrImage);
      if (sub.posterImage) sub.posterImage = fixImageUrl(sub.posterImage);
    }

    // Sort by dayNumber then startTime
    const subEvents = [...subEventsRaw].sort((a, b) => {
      const dayA = a.dayNumber != null ? a.dayNumber : Infinity;
      const dayB = b.dayNumber != null ? b.dayNumber : Infinity;
      if (dayA !== dayB) return dayA - dayB;
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });

    const groupedSubEvents = groupSubEventsByDay(subEvents);

    res.render("events/subevents", { event, subEvents, groupedSubEvents });
  } catch (error) {
    console.error("SubEvents Page Error:", error.message);
    res.redirect("/events");
  }
};


/* ===============================
   ADD EVENT (ADMIN)
================================ */
exports.addEvent = async (req, res) => {
  try {
    const { type, title, shortDescription, description, about, startDate, endDate, registrationLink, isPublic } = req.body;

    if (!title || !startDate || !endDate || !req.file) return res.redirect("/events");

    await Event.create({
      type,
      title,
      shortDescription,
      description,
      about,
      startDate,
      endDate,
      bannerImage: req.file.path,
      registrationLink: registrationLink ? registrationLink.trim() : "",
      isPublic: isPublic !== "false",
    });

    res.redirect("/events");
  } catch (error) {
    console.error("Add Event Error:", error.message);
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

    event.bannerImage = fixImageUrl(event.bannerImage);

    // Sort subevents by dayNumber + startTime for the edit page too
    const subEventsRaw = await SubEvent.find({ eventId: event._id }).lean();
    const subEvents = [...subEventsRaw].sort((a, b) => {
      const dayA = a.dayNumber != null ? a.dayNumber : Infinity;
      const dayB = b.dayNumber != null ? b.dayNumber : Infinity;
      if (dayA !== dayB) return dayA - dayB;
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });

    subEvents.forEach(sub => {
      if (sub.qrImage)     sub.qrImage     = fixImageUrl(sub.qrImage);
      if (sub.posterImage) sub.posterImage = fixImageUrl(sub.posterImage);
    });

    res.render("events/edit", { event, subEvents });
  } catch (error) {
    console.error("Get Edit Event Error:", error.message);
    res.redirect("/events");
  }
};


/* ===============================
   UPDATE EVENT (ADMIN)
================================ */
exports.updateEvent = async (req, res) => {
  try {
    const { title, shortDescription, description, about, startDate, endDate, registrationLink } = req.body;

    const updateData = {
      title,
      shortDescription,
      description,
      about,
      startDate,
      endDate,
      registrationLink: registrationLink ? registrationLink.trim() : "",
      isPublic: req.body.isPublic !== "false",
    };

    if (req.file) updateData.bannerImage = req.file.path;

    await Event.findByIdAndUpdate(req.params.id, updateData);
    res.redirect(`/events/${req.params.id}`);
  } catch (error) {
    console.error("Update Event Error:", error.message);
    res.redirect("/events");
  }
};


/* ===============================
   TOGGLE EVENT PUBLIC/PRIVATE (ADMIN)
================================ */
exports.toggleEventVisibility = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.redirect("/events");
    event.isPublic = event.isPublic === false ? true : false;
    await event.save();
    res.redirect(`/events/edit/${req.params.id}`);
  } catch (error) {
    console.error("Toggle Visibility Error:", error.message);
    res.redirect("/events");
  }
};


/* ===============================
   DELETE EVENT (ADMIN)
================================ */
exports.deleteEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const subEvents = await SubEvent.find({ eventId }).lean();
    for (const sub of subEvents) {
      await Registration.deleteMany({ subEventId: sub._id });
    }
    await SubEvent.deleteMany({ eventId });
    await Event.findByIdAndDelete(eventId);
    res.redirect("/events");
  } catch (error) {
    console.error("Delete Event Error:", error.message);
    res.redirect("/events");
  }
};


/* ===============================
   MANUAL MOVE TO PAST (ADMIN)
================================ */
exports.moveEventToPast = async (req, res) => {
  try {
    await Event.findByIdAndUpdate(req.params.id, { type: "past" });
    res.redirect("/events");
  } catch (error) {
    console.error("Move Event Error:", error.message);
    res.redirect("/events");
  }
};


/* ===============================
   ADD REVIEW (PUBLIC)
================================ */
exports.addReview = async (req, res) => {
  try {
    const { name, message } = req.body;
    const eventId = req.params.id;
    if (!name || !message) return res.redirect(`/events/${eventId}`);
    await Review.create({ event: eventId, name, message });
    res.redirect(`/events/${eventId}`);
  } catch (error) {
    console.error("Add Review Error:", error.message);
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
    console.error("Delete Review Error:", error.message);
    res.redirect("/events");
  }
};


/* ===============================
   DELETE BANNER IMAGE
================================ */
exports.deleteBannerImage = async (req, res) => {
  try {
    await Event.findByIdAndUpdate(req.params.id, { bannerImage: null });
    res.redirect(`/events/${req.params.id}`);
  } catch (error) {
    console.error("Delete Banner Error:", error.message);
    res.redirect("/events");
  }
};


/* ===============================
   ADD GALLERY IMAGE (with speaker + detail)
================================ */
exports.addGalleryImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.redirect(`/events/${req.params.id}`);

    const { speakerName, detail } = req.body;

    const images = req.files.map((file, i) => ({
      url: file.path,
      speakerName: Array.isArray(speakerName) ? (speakerName[i] || "") : (speakerName || ""),
      detail: Array.isArray(detail) ? (detail[i] || "") : (detail || ""),
    }));

    await Event.findByIdAndUpdate(req.params.id, {
      $push: { galleryImages: { $each: images } },
    });

    res.redirect(`/events/${req.params.id}`);
  } catch (error) {
    console.error("Add Gallery Error:", error.message);
    res.redirect("/events");
  }
};


/* ===============================
   UPDATE GALLERY IMAGE META (admin)
================================ */
exports.updateGalleryImageMeta = async (req, res) => {
  try {
    const { eventId, imageId } = req.params;
    const { speakerName, detail } = req.body;

    await Event.findOneAndUpdate(
      { _id: eventId, "galleryImages._id": imageId },
      { $set: { "galleryImages.$.speakerName": speakerName || "", "galleryImages.$.detail": detail || "" } }
    );

    res.redirect(`/events/${eventId}`);
  } catch (error) {
    console.error("Update Gallery Meta Error:", error.message);
    res.redirect("/events");
  }
};


/* ===============================
   DELETE SINGLE GALLERY IMAGE
================================ */
exports.deleteGalleryImage = async (req, res) => {
  try {
    const { eventId, imageId } = req.params;

    await Event.findByIdAndUpdate(eventId, {
      $pull: { galleryImages: { _id: imageId } },
    });

    res.redirect(`/events/${eventId}`);
  } catch (error) {
    console.error("Delete Gallery Image Error:", error.message);
    res.redirect("/events");
  }
};
/* ===============================
   ADD SPEAKER IMAGE
================================ */

exports.addSpeakerImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.redirect(`/events/${req.params.id}`);

    const { speakerName, detail } = req.body;

    const images = req.files.map((file, i) => ({
      url: file.path,
      speakerName: Array.isArray(speakerName) ? (speakerName[i] || "") : (speakerName || ""),
      detail: Array.isArray(detail) ? (detail[i] || "") : (detail || ""),
    }));

    await Event.findByIdAndUpdate(req.params.id, {
      $push: { speakerImages: { $each: images } },
    });

    res.redirect(`/events/${req.params.id}`);
  } catch (error) {
    console.error("Add Speaker Image Error:", error.message);
    res.redirect("/events");
  }
};

exports.updateSpeakerImageMeta = async (req, res) => {
  try {
    const { eventId, imageId } = req.params;
    const { speakerName, detail } = req.body;

    await Event.findOneAndUpdate(
      { _id: eventId, "speakerImages._id": imageId },
      { $set: { "speakerImages.$.speakerName": speakerName || "", "speakerImages.$.detail": detail || "" } }
    );

    res.redirect(`/events/${eventId}`);
  } catch (error) {
    console.error("Update Speaker Meta Error:", error.message);
    res.redirect("/events");
  }
};

exports.deleteSpeakerImage = async (req, res) => {
  try {
    const { eventId, imageId } = req.params;

    await Event.findByIdAndUpdate(eventId, {
      $pull: { speakerImages: { _id: imageId } },
    });

    res.redirect(`/events/${eventId}`);
  } catch (error) {
    console.error("Delete Speaker Image Error:", error.message);
    res.redirect("/events");
  }
};

/* ===============================
   ADD COORDINATOR
================================ */
exports.addCoordinator = async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) return res.redirect(`/events/${req.params.id}`);
    await Event.findByIdAndUpdate(req.params.id, { $push: { conductedBy: { name, email } } });
    res.redirect(`/events/${req.params.id}`);
  } catch (error) {
    console.error("Add Coordinator Error:", error.message);
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
    console.error("Delete Coordinator Error:", error.message);
    res.redirect("/events");
  }
};


/* ===============================
   ADD DOCUMENT
================================ */
exports.addDocument = async (req, res) => {
  try {
    const { title, isPublic } = req.body;
    if (!req.file || !title) return res.redirect(`/events/${req.params.id}`);

    const fileUrl = await uploadDocToCloud(req.file.buffer, req.file.originalname);

    await Event.findByIdAndUpdate(req.params.id, {
      $push: { documents: { title, file: fileUrl, isPublic: isPublic === "on" } },
    });

    res.redirect(`/events/${req.params.id}`);
  } catch (error) {
    console.error("Add Document Error:", error.message);
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
    console.error("Delete Document Error:", error.message);
    res.redirect("/events");
  }
};


/* =================================
   SUBEVENT CRUD (ADMIN)
================================= */

exports.createSubEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const {
      title, description, maxParticipants,
      isGroupEvent, minTeamSize, maxTeamSize,
      dayNumber, eventDate, startTime, endTime,
    } = req.body;

    const files = req.files || {};
    const qrImage     = files.qrImage     ? files.qrImage[0].path     : null;
    const posterImage = files.posterImage ? files.posterImage[0].path : null;

    await SubEvent.create({
      title,
      description,
      eventId,
      maxParticipants: maxParticipants || null,
      isGroupEvent: isGroupEvent === "true",
      minTeamSize: minTeamSize || 1,
      maxTeamSize: maxTeamSize || 1,
      dayNumber: dayNumber ? parseInt(dayNumber) : null,
      eventDate: eventDate || null,
      startTime: startTime || "",
      endTime: endTime || "",
      qrImage,
      posterImage,
      enableTeamMembers: false,
      requirePaymentScreenshot: false,
      externalRegistrationLink: req.body.externalRegistrationLink || "",
    });

    res.redirect(`/events/${eventId}`);
  } catch (error) {
    console.error("Create SubEvent Error:", error.message);
    res.redirect("/events");
  }
};

exports.updateSubEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files || {};

    const updateData = {
      title: req.body.title,
      description: req.body.description,
      maxParticipants: req.body.maxParticipants || null,
      isGroupEvent: req.body.isGroupEvent === "true",
      minTeamSize: req.body.minTeamSize || 1,
      maxTeamSize: req.body.maxTeamSize || 1,
      enableTeamMembers: req.body.enableTeamMembers === "on",
      requirePaymentScreenshot: req.body.requirePaymentScreenshot === "on",
      dayNumber: req.body.dayNumber ? parseInt(req.body.dayNumber) : null,
      eventDate: req.body.eventDate || null,
      startTime: req.body.startTime || "",
      endTime: req.body.endTime || "",
      externalRegistrationLink: req.body.externalRegistrationLink || "",
    };

    if (files.qrImage)     updateData.qrImage     = files.qrImage[0].path;
    if (files.posterImage) updateData.posterImage = files.posterImage[0].path;

    const updated = await SubEvent.findByIdAndUpdate(id, updateData, { new: true });
    res.redirect(`/events/edit/${updated.eventId}`);
  } catch (error) {
    console.error("Update SubEvent Error:", error.message);
    res.redirect("/events");
  }
};

exports.deleteSubEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const subEvent = await SubEvent.findById(id).lean();
    const eventId = subEvent ? subEvent.eventId : null;
    await SubEvent.findByIdAndDelete(id);
    await Registration.deleteMany({ subEventId: id });
    res.redirect(eventId ? `/events/edit/${eventId}` : "/events");
  } catch (error) {
    console.error("Delete SubEvent Error:", error.message);
    res.redirect("/events");
  }
};


/* =================================
   FORM BUILDER
================================= */

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
          ? options ? options.split(",").map(o => o.trim()) : []
          : [],
      order: subEvent.formFields.length,
    };

    subEvent.formFields.push(newField);
    await subEvent.save();
    res.redirect(`/events/edit/${subEvent.eventId}`);
  } catch (error) {
    console.error("Add Form Field Error:", error.message);
    res.redirect("/events");
  }
};

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
        ? options ? options.split(",").map(o => o.trim()) : []
        : [];

    await subEvent.save();
    res.redirect(`/events/edit/${subEvent.eventId}`);
  } catch (error) {
    console.error("Update Form Field Error:", error.message);
    res.redirect("/events");
  }
};

exports.deleteFormField = async (req, res) => {
  try {
    const { id, fieldId } = req.params;
    const subEvent = await SubEvent.findById(id);
    if (!subEvent) return res.redirect("/events");

    subEvent.formFields = subEvent.formFields.filter(
      f => f._id.toString() !== fieldId
    );

    await subEvent.save();
    res.redirect(`/events/edit/${subEvent.eventId}`);
  } catch (error) {
    console.error("Delete Form Field Error:", error.message);
    res.redirect("/events");
  }
};


/* =================================
   USER REGISTRATION
================================= */

exports.showRegistrationForm = async (req, res) => {
  try {
    const { subEventId } = req.params;
    const subEvent = await SubEvent.findById(subEventId).populate("eventId").lean();
    if (!subEvent) return res.redirect("/events");

    if (subEvent.eventId && subEvent.eventId.type === "past") {
      return res.redirect(`/events/${subEvent.eventId._id}`);
    }

    if (subEvent.qrImage)     subEvent.qrImage     = fixImageUrl(subEvent.qrImage);
    if (subEvent.posterImage) subEvent.posterImage = fixImageUrl(subEvent.posterImage);

    const registrationCount = await Registration.countDocuments({ subEventId });
    subEvent.registrationCount = registrationCount;

    res.render("events/register", { subEvent, query: req.query });
  } catch (error) {
    console.error("Show Registration Form Error:", error.message);
    res.redirect("/events");
  }
};

exports.submitRegistration = async (req, res) => {
  try {
    const { subEventId } = req.params;
    const subEvent = await SubEvent.findById(subEventId).lean();
    if (!subEvent) return res.redirect("/events");

    if (subEvent.maxParticipants) {
      const count = await Registration.countDocuments({ subEventId });
      if (count >= subEvent.maxParticipants) {
        return res.redirect(`/register/${subEventId}?error=full`);
      }
    }

    const participantName  = (req.body.participantName  || "").trim();
    const participantEmail = (req.body.participantEmail || "").trim();
    const participantPhone = (req.body.participantPhone || "").trim();

    if (!participantName || !participantEmail || !participantPhone) {
      return res.redirect(`/register/${subEventId}?error=required`);
    }

    const uploadedFiles = {};
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => { uploadedFiles[file.fieldname] = file; });
    }

    const responses = [];
    if (req.body.responses) {
      for (const [fieldId, value] of Object.entries(req.body.responses)) {
        if (!mongoose.Types.ObjectId.isValid(fieldId)) continue;
        const fileKey = `responses[${fieldId}]`;
        const uploadedFile = uploadedFiles[fileKey];
        responses.push({
          fieldId: new mongoose.Types.ObjectId(fieldId),
          value: uploadedFile ? uploadedFile.path : (Array.isArray(value) ? value : value),
        });
      }
    }

    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (file.fieldname === "paymentScreenshot") return;
        const match = file.fieldname.match(/^responses\[(.+)\]$/);
        if (!match) return;
        const fieldId = match[1];
        if (!mongoose.Types.ObjectId.isValid(fieldId)) return;
        const alreadyAdded = responses.find(r => r.fieldId.toString() === fieldId);
        if (!alreadyAdded) {
          responses.push({ fieldId: new mongoose.Types.ObjectId(fieldId), value: file.path });
        }
      });
    }

    for (const field of subEvent.formFields) {
      if (!field.required) continue;
      const found = responses.find(r => r.fieldId.toString() === field._id.toString());
      if (!found || found.value === null || found.value === undefined || found.value === "" ||
          (Array.isArray(found.value) && found.value.length === 0)) {
        return res.redirect(`/register/${subEventId}?error=required`);
      }
    }

    let teamMembers = [];
    if (subEvent.enableTeamMembers && req.body.teamMembers) {
      teamMembers = Array.isArray(req.body.teamMembers)
        ? req.body.teamMembers.filter(m => m.trim() !== "")
        : [req.body.teamMembers].filter(m => m.trim() !== "");
    }

    let paymentScreenshot = null;
    if (subEvent.requirePaymentScreenshot) {
      const screenshotFile = uploadedFiles["paymentScreenshot"];
      if (!screenshotFile) return res.redirect(`/register/${subEventId}?error=payment`);
      paymentScreenshot = screenshotFile.path;
    }

    await Registration.create({
      subEventId,
      participantName,
      participantEmail,
      participantPhone,
      responses,
      teamMembers,
      paymentScreenshot,
      status: "pending",
    });

    res.redirect(`/register/${subEventId}/success`);
  } catch (error) {
    console.error("Submit Registration Error:", error.message);
    res.redirect("/events");
  }
};

exports.registrationSuccess = async (req, res) => {
  try {
    const { subEventId } = req.params;
    const subEvent = await SubEvent.findById(subEventId).populate("eventId").lean();
    if (!subEvent) return res.redirect("/events");
    res.render("events/register-success", { subEvent });
  } catch (error) {
    console.error("Registration Success Error:", error.message);
    res.redirect("/events");
  }
};


/* =================================
   ADMIN REGISTRATION MANAGEMENT
================================= */

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
    console.error("Get Registrations Error:", error.message);
    res.redirect("/events");
  }
};

exports.verifyRegistration = async (req, res) => {
  try {
    const reg = await Registration.findByIdAndUpdate(req.params.id, { status: "verified" }, { new: true });
    res.redirect(`/admin/subevents/${reg.subEventId}/registrations`);
  } catch (error) {
    console.error("Verify Registration Error:", error.message);
    res.redirect("/events");
  }
};

exports.pendingRegistration = async (req, res) => {
  try {
    const reg = await Registration.findByIdAndUpdate(req.params.id, { status: "pending" }, { new: true });
    res.redirect(`/admin/subevents/${reg.subEventId}/registrations`);
  } catch (error) {
    console.error("Pending Registration Error:", error.message);
    res.redirect("/events");
  }
};

exports.rejectRegistration = async (req, res) => {
  try {
    const reg = await Registration.findByIdAndUpdate(req.params.id, { status: "rejected" }, { new: true });
    res.redirect(`/admin/subevents/${reg.subEventId}/registrations`);
  } catch (error) {
    console.error("Reject Registration Error:", error.message);
    res.redirect("/events");
  }
};

exports.deleteRegistration = async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.id).lean();
    const subEventId = reg ? reg.subEventId : null;
    await Registration.findByIdAndDelete(req.params.id);
    res.redirect(subEventId ? `/admin/subevents/${subEventId}/registrations` : "/events");
  } catch (error) {
    console.error("Delete Registration Error:", error.message);
    res.redirect("/events");
  }
};


/* ===============================
   EXPORT REGISTRATIONS CSV
================================ */
exports.exportRegistrationsCSV = async (req, res) => {
  try {
    const { id } = req.params;
    const subEvent = await SubEvent.findById(id).lean();
    if (!subEvent) return res.redirect("/events");

    const registrations = await Registration.find({ subEventId: id })
      .sort({ createdAt: -1 })
      .lean();

    const fieldHeaders = subEvent.formFields
      .sort((a, b) => a.order - b.order)
      .map(f => `"${f.label}"`);

    const headers = [
      '"#"',
      '"Name"',
      '"Email"',
      '"Phone"',
      ...fieldHeaders,
      ...(subEvent.enableTeamMembers ? ['"Team Members"'] : []),
      '"Status"',
      '"Day"',
      '"Date"',
      '"Start Time"',
      '"End Time"',
      '"Registered At"',
    ].join(",");

    const rows = registrations.map((reg, i) => {
      const fieldValues = subEvent.formFields
        .sort((a, b) => a.order - b.order)
        .map(field => {
          const resp = reg.responses.find(r => r.fieldId.toString() === field._id.toString());
          if (!resp) return '""';
          const val = Array.isArray(resp.value) ? resp.value.join("; ") : resp.value;
          return `"${String(val).replace(/"/g, '""')}"`;
        });

      const teamCol = subEvent.enableTeamMembers
        ? [`"${(reg.teamMembers || []).join("; ")}"`]
        : [];

      return [
        i + 1,
        `"${(reg.participantName  || "").replace(/"/g, '""')}"`,
        `"${(reg.participantEmail || "").replace(/"/g, '""')}"`,
        `"${(reg.participantPhone || "").replace(/"/g, '""')}"`,
        ...fieldValues,
        ...teamCol,
        `"${reg.status}"`,
        `"${subEvent.dayNumber || ""}"`,
        `"${subEvent.eventDate ? new Date(subEvent.eventDate).toLocaleDateString("en-IN") : ""}"`,
        `"${subEvent.startTime || ""}"`,
        `"${subEvent.endTime || ""}"`,
        `"${new Date(reg.createdAt).toLocaleString()}"`,
      ].join(",");
    });

    const csv = [headers, ...rows].join("\n");
    const filename = `${subEvent.title.replace(/\s+/g, "_")}_registrations.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error("Export CSV Error:", error.message);
    res.redirect("/events");
  }
};

exports.getSubEventsByEvent = async (eventId) => {
  return await SubEvent.find({ eventId }).lean();
};