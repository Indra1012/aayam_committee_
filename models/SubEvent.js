const mongoose = require("mongoose");

/* ===============================
   DYNAMIC FORM FIELD SCHEMA
================================ */
const formFieldSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true, // e.g. "University Name"
    },
    type: {
      type: String,
      enum: ["text", "textarea", "dropdown", "checkbox", "file"],
      required: true,
    },
    options: [
      {
        type: String, // used for dropdown / checkbox options
      },
    ],
    required: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0, // controls position (first, middle, last)
    },
    placeholder: {
      type: String, // optional hint text
    },
  },
  { _id: true }
);

/* ===============================
   SUB EVENT SCHEMA
================================ */
const subEventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
    },

    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    maxParticipants: {
      type: Number,
      default: null, // null = unlimited
    },

    isGroupEvent: {
      type: Boolean,
      default: false,
    },

    minTeamSize: {
      type: Number,
      default: 1,
    },

    maxTeamSize: {
      type: Number,
      default: 1,
    },

    qrImage: {
      type: String,
      default: null,
    },

    /* 🔥 NEW: Dynamic Form Builder Fields */
    formFields: [formFieldSchema],

    /* 🔥 NEW: Feature Toggles */
    requirePaymentScreenshot: {
      type: Boolean,
      default: false,
    },

    enableTeamMembers: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/* ===============================
   VALIDATION: Team Size Logic
================================ */
subEventSchema.pre("save", async function () {
  if (this.maxTeamSize < this.minTeamSize) {
    throw new Error("Max team size cannot be less than min team size");
  }
});

module.exports = mongoose.model("SubEvent", subEventSchema);