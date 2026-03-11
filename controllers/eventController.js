const Event = require("../models/Event");
const mongoose = require("mongoose");
const Review = require("../models/Review");
const SubEvent = require("../models/SubEvent");
const Registration = require("../models/Registration");
const { uploadDocToCloud } = require("../middlewares/uploadEvent");
const ExcelJS = require("exceljs");


/* ── helpers ── */
function parseTime12(str) {
  if (!str) return "";
  return str.trim();
}

function timeToMinutes(str) {
  if (!str || str.trim() === "") return 9999;
  const match = str.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 9999;
  let hours   = parseInt(match[1], 10);
  const mins  = parseInt(match[2], 10);
  const ampm  = match[3].toUpperCase();
  if (ampm === "AM") {
    if (hours === 12) hours = 0;
  } else {
    if (hours !== 12) hours += 12;
  }
  return hours * 60 + mins;
}

function fixImageUrl(url) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (!url.startsWith("/")) return "/" + url;
  return url;
}

function groupSubEventsByDay(subEvents) {
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

/* ── Check if registration is open for a sub-event ── */
function isRegistrationOpen(sub) {
  if (!sub.registrationDeadline) return true;
  return new Date() <= new Date(sub.registrationDeadline);
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
    await Event.updateMany({ isPublic: { $exists: false } }, { $set: { isPublic: true } });
    await Event.updateMany({ isPublic: null }, { $set: { isPublic: true } });

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

    if (event.posterSlides && event.posterSlides.length > 0) {
      event.posterSlides = event.posterSlides.map(fixImageUrl);
    }

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

    const subEventsRaw = await SubEvent.find({ eventId: event._id }).lean();
    const subEvents = [...subEventsRaw].sort((a, b) => {
      const dayA = a.dayNumber != null ? a.dayNumber : Infinity;
      const dayB = b.dayNumber != null ? b.dayNumber : Infinity;
      if (dayA !== dayB) return dayA - dayB;
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });

    // Attach registration open/closed status
    subEvents.forEach(sub => {
      sub.registrationOpen = isRegistrationOpen(sub);
    });

    const groupedSubEvents = groupSubEventsByDay(subEvents);

    // Sort schedule cards by order
    if (event.scheduleCards) {
      event.scheduleCards.sort((a, b) => a.order - b.order);
    }

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

    const subEventsRaw = await SubEvent.find({ eventId: event._id }).lean();

    for (let sub of subEventsRaw) {
      sub.registrationCount = await Registration.countDocuments({ subEventId: sub._id });
      sub.registrationOpen  = isRegistrationOpen(sub);
      if (sub.qrImage)     sub.qrImage     = fixImageUrl(sub.qrImage);
      if (sub.posterImage) sub.posterImage = fixImageUrl(sub.posterImage);
    }

    const subEvents = [...subEventsRaw].sort((a, b) => {
      const dayA = a.dayNumber != null ? a.dayNumber : Infinity;
      const dayB = b.dayNumber != null ? b.dayNumber : Infinity;
      if (dayA !== dayB) return dayA - dayB;
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });

    const groupedSubEvents = groupSubEventsByDay(subEvents);

    if (event.scheduleCards) {
      event.scheduleCards.sort((a, b) => a.order - b.order);
    }

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
      type, title, shortDescription, description, about, startDate, endDate,
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
    if (event.posterSlides) event.posterSlides = event.posterSlides.map(fixImageUrl);

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

    if (event.scheduleCards) event.scheduleCards.sort((a, b) => a.order - b.order);

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
      title, shortDescription, description, about, startDate, endDate,
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
   ADD POSTER SLIDE (ADMIN)
================================ */
exports.addPosterSlides = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.redirect(`/events/edit/${req.params.id}`);
    const urls = req.files.map(f => f.path);
    await Event.findByIdAndUpdate(req.params.id, {
      $push: { posterSlides: { $each: urls } },
    });
    res.redirect(`/events/edit/${req.params.id}`);
  } catch (error) {
    console.error("Add Poster Slides Error:", error.message);
    res.redirect("/events");
  }
};


/* ===============================
   DELETE POSTER SLIDE (ADMIN)
================================ */
exports.deletePosterSlide = async (req, res) => {
  try {
    const { id, index } = req.params;
    const event = await Event.findById(id);
    if (!event) return res.redirect("/events");
    event.posterSlides.splice(parseInt(index), 1);
    await event.save();
    res.redirect(`/events/edit/${id}`);
  } catch (error) {
    console.error("Delete Poster Slide Error:", error.message);
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
   ADD GALLERY IMAGE
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
    const fileUrl = await uploadDocToCloud(req.file.buffer, req.file.originalname, req.file.mimetype);
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
   SCHEDULE CARDS CRUD (ADMIN)
================================= */

exports.addScheduleCard = async (req, res) => {
  try {
    const { id } = req.params;
    const { heading, body } = req.body;
    if (!heading) return res.redirect(`/events/edit/${id}`);
    const event = await Event.findById(id);
    if (!event) return res.redirect("/events");
    const order = (event.scheduleCards || []).length;
    event.scheduleCards.push({ heading, body: body || "", order });
    await event.save();
    res.redirect(`/events/edit/${id}`);
  } catch (error) {
    console.error("Add Schedule Card Error:", error.message);
    res.redirect("/events");
  }
};

exports.updateScheduleCard = async (req, res) => {
  try {
    const { id, cardId } = req.params;
    const { heading, body } = req.body;
    await Event.findOneAndUpdate(
      { _id: id, "scheduleCards._id": cardId },
      { $set: { "scheduleCards.$.heading": heading || "", "scheduleCards.$.body": body || "" } }
    );
    res.redirect(`/events/edit/${id}`);
  } catch (error) {
    console.error("Update Schedule Card Error:", error.message);
    res.redirect("/events");
  }
};

exports.deleteScheduleCard = async (req, res) => {
  try {
    const { id, cardId } = req.params;
    await Event.findByIdAndUpdate(id, {
      $pull: { scheduleCards: { _id: cardId } },
    });
    res.redirect(`/events/edit/${id}`);
  } catch (error) {
    console.error("Delete Schedule Card Error:", error.message);
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
      registrationDeadline,
    } = req.body;

    const files = req.files || {};
    const qrImage     = files.qrImage     ? files.qrImage[0].path     : null;
    const posterImage = files.posterImage ? files.posterImage[0].path : null;

    await SubEvent.create({
      title, description, eventId,
      maxParticipants: maxParticipants || null,
      isGroupEvent: isGroupEvent === "true",
      minTeamSize: minTeamSize || 1,
      maxTeamSize: maxTeamSize || 1,
      dayNumber: dayNumber ? parseInt(dayNumber) : null,
      eventDate: eventDate || null,
      startTime: startTime || "",
      endTime: endTime || "",
      registrationDeadline: registrationDeadline || null,
      qrImage, posterImage,
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
      registrationDeadline: req.body.registrationDeadline || null,
      externalRegistrationLink: req.body.externalRegistrationLink || "",
    };

    if (files.qrImage)     updateData.qrImage     = files.qrImage[0].path;
    if (files.posterImage) updateData.posterImage = files.posterImage[0].path;

    const updated = await SubEvent.findByIdAndUpdate(id, updateData, { new: true });

    // Redirect back to where the request came from
    const referer = req.body._referer || "edit";
    if (referer === "show") {
      res.redirect(`/events/${updated.eventId}`);
    } else {
      res.redirect(`/events/edit/${updated.eventId}`);
    }
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


/* ── NEW: Delete QR image from sub-event ── */
exports.deleteSubEventQr = async (req, res) => {
  try {
    const { id } = req.params;
    const sub = await SubEvent.findByIdAndUpdate(id, { $set: { qrImage: null } }, { new: true });
    res.redirect(`/events/edit/${sub.eventId}`);
  } catch (error) {
    console.error("Delete QR Error:", error.message);
    res.redirect("/events");
  }
};

/* ── NEW: Delete poster image from sub-event ── */
exports.deleteSubEventPoster = async (req, res) => {
  try {
    const { id } = req.params;
    const sub = await SubEvent.findByIdAndUpdate(id, { $set: { posterImage: null } }, { new: true });
    res.redirect(`/events/edit/${sub.eventId}`);
  } catch (error) {
    console.error("Delete Poster Error:", error.message);
    res.redirect("/events");
  }
};


/* =================================
   FORM BUILDER
================================= */

exports.addFormField = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, type, options, required, placeholder, askForMembers } = req.body;
    const subEvent = await SubEvent.findById(id);
    if (!subEvent) return res.redirect("/events");
    const newField = {
      label, type,
      required:      required === "on",
      placeholder:   placeholder || "",
      askForMembers: askForMembers === "on" && type !== "file",
      options: type === "dropdown" || type === "checkbox"
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
    const { label, type, options, required, placeholder, askForMembers } = req.body;
    const subEvent = await SubEvent.findById(id);
    if (!subEvent) return res.redirect("/events");
    const field = subEvent.formFields.id(fieldId);
    if (!field) return res.redirect(`/events/edit/${subEvent.eventId}`);
    field.label         = label;
    field.type          = type;
    field.required      = required === "on";
    field.placeholder   = placeholder || "";
    field.askForMembers = askForMembers === "on" && type !== "file";
    field.options = type === "dropdown" || type === "checkbox"
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
    subEvent.formFields = subEvent.formFields.filter(f => f._id.toString() !== fieldId);
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

    // Check registration deadline
    if (!isRegistrationOpen(subEvent)) {
      return res.redirect(`/register/${subEventId}?error=deadline`);
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

    // Deadline check
    if (!isRegistrationOpen(subEvent)) {
      return res.redirect(`/register/${subEventId}?error=deadline`);
    }

    // Capacity check
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
        const fileKey      = `responses[${fieldId}]`;
        const uploadedFile = uploadedFiles[fileKey];
        responses.push({
          fieldId: new mongoose.Types.ObjectId(fieldId),
          value:   uploadedFile ? uploadedFile.path : (Array.isArray(value) ? value : value),
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
    if (subEvent.enableTeamMembers && req.body.members) {
      const membersRaw = Array.isArray(req.body.members)
        ? req.body.members
        : Object.values(req.body.members);
      teamMembers = membersRaw
        .filter(m => m && (m.name || "").trim() !== "")
        .map(m => {
          const memberResponses = [];
          if (m.responses) {
            for (const [fieldId, value] of Object.entries(m.responses)) {
              if (!mongoose.Types.ObjectId.isValid(fieldId)) continue;
              memberResponses.push({
                fieldId: new mongoose.Types.ObjectId(fieldId),
                value:   Array.isArray(value) ? value : value,
              });
            }
          }
          return {
            name:      (m.name  || "").trim(),
            email:     (m.email || "").trim(),
            phone:     (m.phone || "").trim(),
            responses: memberResponses,
          };
        });
    }

    let paymentScreenshot = null;
    if (subEvent.requirePaymentScreenshot) {
      const screenshotFile = uploadedFiles["paymentScreenshot"];
      if (!screenshotFile) return res.redirect(`/register/${subEventId}?error=payment`);
      paymentScreenshot = screenshotFile.path;
    }

    await Registration.create({
      subEventId, participantName, participantEmail, participantPhone,
      responses, teamMembers, paymentScreenshot, status: "pending",
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
   EXPORT REGISTRATIONS CSV (single sub-event) — UNCHANGED
================================ */
exports.exportRegistrationsCSV = async (req, res) => {
  try {
    const { id } = req.params;
    const subEvent = await SubEvent.findById(id).lean();
    if (!subEvent) return res.redirect("/events");

    const registrations = await Registration.find({ subEventId: id })
      .sort({ createdAt: -1 })
      .lean();

    const q  = (s) => `"${String(s || "").replace(/"/g, '""')}"`;
    const qt = (s) => `"'${String(s || "").replace(/"/g, '""')}"`;

    const sortedFields = (subEvent.formFields || []).slice().sort((a, b) => a.order - b.order);
    const memberCustomFields = sortedFields.filter(f => f.askForMembers && f.type !== "file");

    let maxMembers = 0;
    if (subEvent.enableTeamMembers) {
      registrations.forEach(r => {
        const n = (r.teamMembers || []).length;
        if (n > maxMembers) maxMembers = n;
      });
    }

    const headerCols = ['"#"', '"Leader Name"', '"Leader Email"', '"Leader Phone"'];
    sortedFields.forEach(f => headerCols.push(q(f.label)));

    if (subEvent.enableTeamMembers) {
      for (let m = 1; m <= maxMembers; m++) {
        headerCols.push(q(`Member ${m} — Name`));
        headerCols.push(q(`Member ${m} — Email`));
        headerCols.push(q(`Member ${m} — Phone`));
        memberCustomFields.forEach(f => headerCols.push(q(`Member ${m} — ${f.label}`)));
      }
    }

    headerCols.push('"Status"', '"Day"', '"Event Date"', '"Start Time"', '"End Time"', '"Registered At"');

    const rows = registrations.map((reg, i) => {
      const cols = [];
      cols.push(i + 1);
      cols.push(q(reg.participantName));
      cols.push(q(reg.participantEmail));
      cols.push(qt(reg.participantPhone));

      sortedFields.forEach(field => {
        const resp = (reg.responses || []).find(
          r => r.fieldId && r.fieldId.toString() === field._id.toString()
        );
        if (!resp || resp.value === null || resp.value === undefined) { cols.push('""'); return; }
        if (field.type === "file") { cols.push(q(resp.value)); return; }
        const val = Array.isArray(resp.value) ? resp.value.join("; ") : resp.value;
        cols.push(q(val));
      });

      if (subEvent.enableTeamMembers) {
        const members = (reg.teamMembers || []).map(m =>
          typeof m === "string" ? { name: m, email: "", phone: "", responses: [] } : m
        );
        for (let mi = 0; mi < maxMembers; mi++) {
          const member = members[mi] || null;
          cols.push(member ? q(member.name)  : '""');
          cols.push(member ? q(member.email) : '""');
          cols.push(member && member.phone ? qt(member.phone) : '""');
          memberCustomFields.forEach(field => {
            if (!member || !member.responses || member.responses.length === 0) { cols.push('""'); return; }
            const mr = member.responses.find(r => r.fieldId && r.fieldId.toString() === field._id.toString());
            if (!mr || mr.value === null || mr.value === undefined) { cols.push('""'); return; }
            const mv = Array.isArray(mr.value) ? mr.value.join("; ") : mr.value;
            cols.push(q(mv));
          });
        }
      }

      cols.push(q(reg.status));
      cols.push(q(subEvent.dayNumber || ""));
      cols.push(q(subEvent.eventDate ? new Date(subEvent.eventDate).toLocaleDateString("en-IN") : ""));
      cols.push(q(subEvent.startTime || ""));
      cols.push(q(subEvent.endTime   || ""));
      cols.push(q(new Date(reg.createdAt).toLocaleString("en-IN")));

      return cols.join(",");
    });

    const csv      = [headerCols.join(","), ...rows].join("\n");
    const filename = `${subEvent.title.replace(/\s+/g, "_")}_registrations.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send("\uFEFF" + csv);
  } catch (error) {
    console.error("Export CSV Error:", error.message);
    res.redirect("/events");
  }
};


/* ===============================
   EXPORT ALL REGISTRATIONS — multi-sheet XLSX
   Sheet 1: "All Events" summary
   Then one sheet per sub-event named after sub-event title
================================ */
exports.exportAllRegistrationsCSV = async (req, res) => {
  try {
    const { id } = req.params;
    const event  = await Event.findById(id).lean();
    if (!event) return res.redirect("/events");

    const subEvents = await SubEvent.find({ eventId: id })
      .sort({ dayNumber: 1, startTime: 1 })
      .lean();

    const wb = new ExcelJS.Workbook();
    wb.creator = "Aayam";
    wb.created = new Date();

    /* ── colour palette ── */
    const BRAND_BG   = "FFA67C52"; // brown header bg
    const BRAND_FG   = "FFFFFFFF";
    const ALT_ROW    = "FFFFF8F2";
    const HEADER_BG  = "FF6B3F1A";

    const headerStyle = {
      font:      { bold: true, color: { argb: BRAND_FG }, name: "Arial", size: 10 },
      fill:      { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } },
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      border: {
        bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
        right:  { style: "thin", color: { argb: "FFCCCCCC" } },
      },
    };

    const titleStyle = {
      font:      { bold: true, color: { argb: BRAND_FG }, name: "Arial", size: 11 },
      fill:      { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_BG } },
      alignment: { horizontal: "left", vertical: "middle" },
    };

    /* ════════════════════════════════════
       SHEET 1 — Summary across all sub-events
    ════════════════════════════════════ */
    const summarySheet = wb.addWorksheet("Summary", {
      views: [{ state: "frozen", ySplit: 3 }],
    });

    // Event title banner
    summarySheet.mergeCells("A1:F1");
    const titleCell = summarySheet.getCell("A1");
    titleCell.value = `${event.title} — All Registrations Summary`;
    Object.assign(titleCell, titleStyle);
    summarySheet.getRow(1).height = 28;

    // Sub-header
    summarySheet.mergeCells("A2:F2");
    const subTitleCell = summarySheet.getCell("A2");
    subTitleCell.value = `Generated: ${new Date().toLocaleString("en-IN")}   |   Total Sub-Events: ${subEvents.length}`;
    subTitleCell.font  = { italic: true, color: { argb: "FF888888" }, size: 9 };
    summarySheet.getRow(2).height = 18;

    const summaryHeaders = ["#", "Sub-Event", "Day", "Date", "Time", "Registrations"];
    const summaryHeaderRow = summarySheet.addRow(summaryHeaders);
    summaryHeaderRow.height = 22;
    summaryHeaderRow.eachCell(cell => Object.assign(cell, headerStyle));

    let summaryTotal = 0;
    for (let si = 0; si < subEvents.length; si++) {
      const sub   = subEvents[si];
      const count = await Registration.countDocuments({ subEventId: sub._id });
      summaryTotal += count;
      const row = summarySheet.addRow([
        si + 1,
        sub.title,
        sub.dayNumber || "",
        sub.eventDate ? new Date(sub.eventDate).toLocaleDateString("en-IN") : "",
        [sub.startTime, sub.endTime].filter(Boolean).join(" – "),
        count,
      ]);
      if (si % 2 === 1) {
        row.eachCell(cell => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW } };
        });
      }
      row.getCell(6).font = { bold: true };
    }

    // Total row
    const totalRow = summarySheet.addRow(["", "TOTAL", "", "", "", summaryTotal]);
    totalRow.getCell(2).font = { bold: true };
    totalRow.getCell(6).font = { bold: true };
    totalRow.eachCell(cell => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF0E0" } };
      cell.border = { top: { style: "medium", color: { argb: BRAND_BG } } };
    });

    summarySheet.columns = [
      { width: 5 }, { width: 36 }, { width: 8 }, { width: 16 }, { width: 20 }, { width: 16 },
    ];

    /* ════════════════════════════════════
       ONE SHEET PER SUB-EVENT
    ════════════════════════════════════ */
    for (const subEvent of subEvents) {
      const registrations = await Registration.find({ subEventId: subEvent._id })
        .sort({ createdAt: -1 })
        .lean();

      const sortedFields      = (subEvent.formFields || []).slice().sort((a, b) => a.order - b.order);
      const memberCustomFields = sortedFields.filter(f => f.askForMembers && f.type !== "file");

      let maxMembers = 0;
      if (subEvent.enableTeamMembers) {
        registrations.forEach(r => {
          const n = (r.teamMembers || []).length;
          if (n > maxMembers) maxMembers = n;
        });
      }

      // Sheet name: max 31 chars, no special chars
      const rawName   = subEvent.title.replace(/[\\\/\*\?\[\]\:]/g, " ").trim();
      const sheetName = rawName.length > 31 ? rawName.substring(0, 28) + "..." : rawName;

      const ws = wb.addWorksheet(sheetName, {
        views: [{ state: "frozen", ySplit: 3 }],
      });

      /* Title row */
      const dayLabel  = subEvent.dayNumber ? `Day ${subEvent.dayNumber}  ·  ` : "";
      const dateLabel = subEvent.eventDate  ? new Date(subEvent.eventDate).toLocaleDateString("en-IN") + "  ·  " : "";
      const timeLabel = subEvent.startTime  ? subEvent.startTime + (subEvent.endTime ? " – " + subEvent.endTime : "") : "";
      const titleText = `${subEvent.title}    |    ${dayLabel}${dateLabel}${timeLabel}    |    ${registrations.length} Registrations`;

      /* Build header columns list first so we know merge width */
      const colDefs = [
        { header: "#",              key: "num",    width: 5  },
        { header: "Name",           key: "name",   width: 22 },
        { header: "Email",          key: "email",  width: 28 },
        { header: "Phone",          key: "phone",  width: 16 },
      ];
      sortedFields.forEach(f => {
        colDefs.push({ header: f.label, key: `field_${f._id}`, width: 20 });
      });
      if (subEvent.enableTeamMembers) {
        for (let m = 1; m <= maxMembers; m++) {
          colDefs.push({ header: `Member ${m} — Name`,  key: `m${m}_name`,  width: 20 });
          colDefs.push({ header: `Member ${m} — Email`, key: `m${m}_email`, width: 24 });
          colDefs.push({ header: `Member ${m} — Phone`, key: `m${m}_phone`, width: 16 });
          memberCustomFields.forEach(f => {
            colDefs.push({ header: `M${m} — ${f.label}`, key: `m${m}_f_${f._id}`, width: 18 });
          });
        }
      }
      colDefs.push(
        { header: "Status",        key: "status", width: 12 },
        { header: "Registered At", key: "regAt",  width: 22 },
      );

      const lastCol = colDefs.length;

      /* Set column widths FIRST (before any merges) */
      colDefs.forEach((col, idx) => {
        ws.getColumn(idx + 1).width = col.width;
        ws.getColumn(idx + 1).key   = col.key;
      });

      /* Title banner — row 1 */
      ws.mergeCells(1, 1, 1, lastCol);
      const tc = ws.getCell("A1");
      tc.value = titleText;
      Object.assign(tc, titleStyle);
      ws.getRow(1).height = 26;

      /* Generated date sub-row — row 2 */
      ws.mergeCells(2, 1, 2, lastCol);
      const sc = ws.getCell("A2");
      sc.value = `Event: ${event.title}   |   Exported: ${new Date().toLocaleString("en-IN")}`;
      sc.font  = { italic: true, color: { argb: "FF888888" }, size: 9 };
      ws.getRow(2).height = 16;

      /* Column header row — row 3 */
      const headerRow = ws.getRow(3);
      colDefs.forEach((col, idx) => {
        headerRow.getCell(idx + 1).value = col.header;
      });
      headerRow.height = 24;
      headerRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        if (colNum <= lastCol) Object.assign(cell, headerStyle);
      });

      /* Data rows */
      registrations.forEach((reg, i) => {
        const rowValues = [];

        rowValues.push(i + 1);                          // #
        rowValues.push(reg.participantName  || "");     // Name
        rowValues.push(reg.participantEmail || "");     // Email
        rowValues.push(reg.participantPhone ? `'${reg.participantPhone}` : ""); // Phone

        sortedFields.forEach(field => {
          const resp = (reg.responses || []).find(
            r => r.fieldId && r.fieldId.toString() === field._id.toString()
          );
          const val = resp && resp.value != null
            ? (field.type === "file" ? resp.value : (Array.isArray(resp.value) ? resp.value.join("; ") : String(resp.value)))
            : "";
          rowValues.push(val);
        });

        if (subEvent.enableTeamMembers) {
          const members = (reg.teamMembers || []).map(m =>
            typeof m === "string" ? { name: m, email: "", phone: "", responses: [] } : m
          );
          for (let mi = 0; mi < maxMembers; mi++) {
            const member = members[mi] || null;
            rowValues.push(member ? (member.name  || "") : "");
            rowValues.push(member ? (member.email || "") : "");
            rowValues.push((member && member.phone) ? `'${member.phone}` : "");
            memberCustomFields.forEach(field => {
              const mr = member && member.responses
                ? member.responses.find(r => r.fieldId && r.fieldId.toString() === field._id.toString())
                : null;
              rowValues.push(mr && mr.value != null
                ? (Array.isArray(mr.value) ? mr.value.join("; ") : String(mr.value))
                : "");
            });
          }
        }

        rowValues.push(reg.status || "");   // Status
        rowValues.push(reg.createdAt ? new Date(reg.createdAt).toLocaleString("en-IN") : ""); // Registered At

        const dataRow = ws.addRow(rowValues);
        dataRow.height = 18;

        // Alternate row shading
        if (i % 2 === 1) {
          dataRow.eachCell({ includeEmpty: true }, cell => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW } };
          });
        }

        // Status colour — status is the 2nd-to-last column
        const statusColIdx = rowValues.length - 1; // 1-based: length
        const statusCell = dataRow.getCell(statusColIdx);
        if (reg.status === "verified") {
          statusCell.font = { bold: true, color: { argb: "FF27AE60" } };
        } else if (reg.status === "rejected") {
          statusCell.font = { bold: true, color: { argb: "FFC0392B" } };
        } else {
          statusCell.font = { color: { argb: "FFA67C52" } };
        }

        // Light border
        dataRow.eachCell({ includeEmpty: true }, cell => {
          cell.border = { bottom: { style: "hair", color: { argb: "FFEEEEEE" } } };
        });
      });

      // Empty state
      if (registrations.length === 0) {
        const emptyRow = ws.addRow(["", "No registrations yet."]);
        emptyRow.getCell(2).font = { italic: true, color: { argb: "FF999999" } };
      }

      // Auto-filter on header row
      ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: lastCol } };
    }

    /* ── Stream to response ── */
    const safeName = event.title.replace(/[^a-zA-Z0-9_\- ]/g, "_").replace(/\s+/g, "_");
    const filename = `${safeName}_ALL_registrations.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-cache");
    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Export All XLSX Error:", error.message, error.stack);
    if (!res.headersSent) {
      res.status(500).send(`Export failed: ${error.message}. Make sure 'exceljs' is installed: npm install exceljs`);
    }
  }
};


exports.getSubEventsByEvent = async (eventId) => {
  return await SubEvent.find({ eventId }).lean();
};