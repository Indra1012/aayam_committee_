const mongoose = require("mongoose");

const responseSchema = new mongoose.Schema(
  {
    fieldId: { type: mongoose.Schema.Types.ObjectId, required: true },
    value:   { type: mongoose.Schema.Types.Mixed,    required: true },
  },
  { _id: false }
);

// ── NEW: each team member has their own name/email/phone + custom field responses ──
const teamMemberSchema = new mongoose.Schema(
  {
    name:      { type: String, default: "" },
    email:     { type: String, default: "" },
    phone:     { type: String, default: "" },
    responses: [responseSchema],   // custom fields with askForMembers:true
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

    // ── Built-in participant fields (always collected — this is the LEADER) ──
    participantName:  { type: String, default: "" },
    participantEmail: { type: String, default: "" },
    participantPhone: { type: String, default: "" },

    // ── Dynamic form answers (leader only) ──
    responses: [responseSchema],

    // ── Team members — now structured (name + email + phone + their own responses) ──
    // BACKWARD COMPATIBLE: old String entries still readable, new ones are objects
    teamMembers: { type: mongoose.Schema.Types.Mixed, default: [] },

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