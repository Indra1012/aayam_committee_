const mongoose = require("mongoose");

const teamSectionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TeamSection", teamSectionSchema);
