// models/Event.js 
const mongoose = require("mongoose");

const galleryItemSchema = new mongoose.Schema({
  url:         { type: String, required: true },
  speakerName: { type: String, default: "" },
  detail:      { type: String, default: "" },
}, { _id: true });

/* ── Schedule card — supports rich text AND/OR table ── */
const scheduleCardSchema = new mongoose.Schema({
  heading:  { type: String, required: true },
  body:     { type: String, default: "" },
  tableData: {
    columns: [{ type: String }],
    rows:    [[{ type: String }]],
  },
  order: { type: Number, default: 0 },
}, { _id: true });

const eventSchema = new mongoose.Schema(
  {
    isPublic:         { type: Boolean, default: true },
    type:             { type: String, enum: ["upcoming", "past"], required: true },
    title:            { type: String, required: true, trim: true },
    shortDescription: { type: String, required: true, trim: true },
    description:      { type: String, required: true },
    about:            { type: String },
    startDate:        { type: Date, required: true },
    endDate:          { type: Date, required: true },
    bannerImage:      { type: String, required: true },
    posterSlides:     [{ type: String }],
    registrationLink: { type: String, default: "", trim: true },
    galleryImages:    [galleryItemSchema],
    speakerImages:    [galleryItemSchema],
    conductedBy:      [{ name: String, email: String }],
    contacts:         [String],
    prizes:           [String],
    documents: [{
      title:    String,
      file:     String,
      isPublic: { type: Boolean, default: false },
    }],
    scheduleCards: [scheduleCardSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);