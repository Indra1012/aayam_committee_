const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload");
const homeController = require("../controllers/homeController");
const { isAdmin } = require("../middlewares/authMiddleware");

router.post(
  "/home/upload",
  isAdmin,
  upload.single("image"),
  homeController.addImage
);

router.post(
  "/home/delete/:id",
  isAdmin,
  homeController.deleteImage
);

module.exports = router;
