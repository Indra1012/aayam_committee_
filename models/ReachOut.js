const mongoose = require("mongoose");

const reachOutSchema = new mongoose.Schema(
  {
    /* ===============================
       BASIC INFO
    =============================== */
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    contact: {
      type: String,
      trim: true,
    },

    /* ===============================
       MESSAGE CONTENT
    =============================== */
    purpose: {
      type: String,
      required: true,
      enum: [
        "Event Feedback",
        "Event Idea",
        "Collaboration",
        "Sponsorship",
        "Volunteer",
        "General Query",
      ],
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    /* ===============================
       ADMIN CONTROLS
    =============================== */
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ReachOut", reachOutSchema);
