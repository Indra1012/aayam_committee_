const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    /* ===============================
       BASIC INFO
    =============================== */
    name: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },
  
    /* ===============================
       ROLE SYSTEM
       superadmin → main admin
       admin      → normal admin
       user       → public user
    =============================== */
    role: {
      type: String,
      enum: ["superadmin", "admin", "user"],
      default: "user",
    },

    /* ===============================
       ACCOUNT STATUS
       Used to disable admins/users
    =============================== */
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
