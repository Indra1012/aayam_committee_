const mongoose = require("mongoose");

/* ===============================
   DYNAMIC FORM FIELD SCHEMA
================================ */
const formFieldSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    type: {
      type: String,
      enum: ["text", "textarea", "dropdown", "checkbox", "file"],
      required: true,
    },
    options: [{ type: String }],
    required: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    placeholder: { type: String },
  },
  { _id: true }
);

/* ===============================
   SUB EVENT SCHEMA
================================ */
const subEventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },

    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    // ── Day / Date / Time ──
    dayNumber: { type: Number, default: null },
    eventDate: { type: Date, default: null },
    startTime: { type: String, default: "" },
    endTime:   { type: String, default: "" },

    // ── Capacity ──
    maxParticipants: { type: Number, default: null },

    // ── Team settings ──
    isGroupEvent: { type: Boolean, default: false },
    minTeamSize: { type: Number, default: 1 },
    maxTeamSize: { type: Number, default: 1 },

    // ── Images ──
    qrImage:     { type: String, default: null },
    posterImage: { type: String, default: null },

    // ── Dynamic form ──
    formFields: [formFieldSchema],

    // ── Toggles ──
    requirePaymentScreenshot: { type: Boolean, default: false },
    enableTeamMembers: { type: Boolean, default: false },

    // ── External registration link ──
    externalRegistrationLink: { type: String, default: "" },
  },
  { timestamps: true }
);

/* Validation */
subEventSchema.pre("save", async function () {
  if (this.maxTeamSize < this.minTeamSize) {
    throw new Error("Max team size cannot be less than min team size");
  }
});

module.exports = mongoose.model("SubEvent", subEventSchema);