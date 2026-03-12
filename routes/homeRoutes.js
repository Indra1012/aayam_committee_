const express = require("express");
const router  = express.Router();
const upload  = require("../middlewares/upload");
const homeController = require("../controllers/homeController");
const { isAdmin } = require("../middlewares/authMiddleware");

router.post("/home/upload",     isAdmin, upload.single("image"), homeController.addImage);
router.post("/home/delete/:id", isAdmin, homeController.deleteImage);

/* ── Promo banner ── */
router.post("/home/promo/add",        isAdmin, homeController.addPromo);
router.post("/home/promo/:id/delete", isAdmin, homeController.deletePromo);
router.post("/home/promo/:id/toggle", isAdmin, homeController.togglePromo);

module.exports = router;