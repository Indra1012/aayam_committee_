const mongoose = require("mongoose");

const galleryItemSchema = new mongoose.Schema({
  url: { type: String, required: true },
  speakerName: { type: String, default: "" },
  detail: { type: String, default: "" },
}, { _id: true });

/* ── NEW: Schedule card schema ── */
const scheduleCardSchema = new mongoose.Schema({
  heading:     { type: String, required: true },   // e.g. "Day 1 — 18 March 2026"
  body:        { type: String, default: "" },       // rich-text HTML
  order:       { type: Number, default: 0 },
}, { _id: true });

const eventSchema = new mongoose.Schema(
  {
    isPublic: {
      type: Boolean,
      default: true,
    },

    type: {
      type: String,
      enum: ["upcoming", "past"],
      required: true,
    },

    title: { type: String, required: true, trim: true },
    shortDescription: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    about: { type: String },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    bannerImage: { type: String, required: true },

    /* ── NEW: Extra poster slides (in addition to bannerImage) ── */
    posterSlides: [{ type: String }],

    registrationLink: { type: String, default: "", trim: true },

    galleryImages: [galleryItemSchema],
    speakerImages: [galleryItemSchema],

    conductedBy: [{ name: String, email: String }],
    contacts: [String],
    prizes: [String],
    documents: [
      {
        title: String,
        file: String,
        isPublic: { type: Boolean, default: false },
      },
    ],

    /* ── NEW: Admin-authored schedule / info cards ── */
    scheduleCards: [scheduleCardSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);