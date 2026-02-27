const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["upcoming", "past"],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    shortDescription: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    about: {
      type: String,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    bannerImage: {
      type: String,
      required: true,
    },

    // registrationLink: {
    //   type: String,
    // },

    // For Phase 4D / 4F (future)
    galleryImages: [String],
    conductedBy: [
      {
        name: String,
        email: String,
      }
    ],
    contacts: [String],
    prizes: [String],
    documents: [
  {
    title: String,
    file: String,
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
],

  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
