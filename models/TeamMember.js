const mongoose = require("mongoose");

const teamMemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    position: { type: String, default: "" },  // not required — some members may not have a title
    image: { type: String, required: true },
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeamSection",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TeamMember", teamMemberSchema);