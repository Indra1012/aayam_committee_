const mongoose = require("mongoose");

const homePromoSchema = new mongoose.Schema({
  label:       { type: String, default: "Register Now" },
  title:       { type: String, required: true },
  heading:     { type: String, default: "" },        // ← NEW: sub-heading below REGISTER NOW, above countdown
  description: { type: String, default: "" },
  link:        { type: String, default: "" },
  eventDate:   { type: Date, default: null },
  isActive:    { type: Boolean, default: true },
  createdAt:   { type: Date, default: Date.now },
});

module.exports = mongoose.model("HomePromo", homePromoSchema);