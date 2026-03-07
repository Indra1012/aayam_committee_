const mongoose = require("mongoose");

const galleryItemSchema = new mongoose.Schema({
  url: { type: String, required: true },
  speakerName: { type: String, default: "" },
  detail: { type: String, default: "" },
}, { _id: true });

const eventSchema = new mongoose.Schema(
  {
    // ── Visibility: true = fully public, false = private (admin only) ──
    // DEFAULT IS TRUE — every new event is public unless admin explicitly changes it
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

    registrationLink: { type: String, default: "", trim: true },

    galleryImages: [galleryItemSchema],

    // ── Speaker images — same structure as galleryImages ──
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
