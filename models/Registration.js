const mongoose = require("mongoose");

const responseSchema = new mongoose.Schema(
  {
    fieldId: { type: mongoose.Schema.Types.ObjectId, required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

const registrationSchema = new mongoose.Schema(
  {
    subEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubEvent",
      required: true,
    },

    // ── Built-in participant fields (always collected) ──
    participantName:  { type: String, default: "" },
    participantEmail: { type: String, default: "" },
    participantPhone: { type: String, default: "" },

    // ── Dynamic form answers ──
    responses: [responseSchema],

    // ── Team members (optional) ──
    teamMembers: { type: [String], default: [] },

    // ── Payment screenshot ──
    paymentScreenshot: { type: String, default: null },

    status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Registration", registrationSchema);