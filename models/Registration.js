const mongoose = require("mongoose");

const responseSchema = new mongoose.Schema(
  {
    fieldId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true, // references SubEvent.formFields._id
    },
    value: {
      type: mongoose.Schema.Types.Mixed, 
      // Can store text, array (checkbox), file path, etc.
      required: true,
    },
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

    // 🔥 dynamic form answers
    responses: [responseSchema],

    // optional team members (only if enabled)
    teamMembers: {
      type: [String],
      default: [],
    },

    // optional payment screenshot
    paymentScreenshot: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Registration", registrationSchema);