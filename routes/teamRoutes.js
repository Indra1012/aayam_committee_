const express = require("express");
const router = express.Router();

const teamController = require("../controllers/teamController");
const { isAdmin } = require("../middlewares/authMiddleware");
const uploadTeam = require("../middlewares/uploadTeam");

/* ===============================
   VIEW TEAM PAGE
================================ */
router.get("/team", teamController.getTeamPage);

/* ===============================
   TEAM SECTION CRUD (ADMIN)
================================ */
router.post("/team/section/add", isAdmin, teamController.addTeamSection);

router.get("/team/section/edit/:id", isAdmin, teamController.getEditSection);

router.post("/team/section/edit/:id", isAdmin, teamController.updateSection);

router.post("/team/section/delete/:id", isAdmin, teamController.deleteTeamSection);

/* ===============================
   TEAM MEMBER CRUD (ADMIN)
================================ */
router.post(
  "/team/member/add",
  isAdmin,
  uploadTeam.single("image"),
  teamController.addTeamMember
);

router.get(
  "/team/member/edit/:id",
  isAdmin,
  teamController.getEditMember
);

router.post(
  "/team/member/edit/:id",
  isAdmin,
  uploadTeam.single("image"), // 🔥 THIS WAS MISSING
  teamController.updateMember
);

router.post(
  "/team/member/delete/:id",
  isAdmin,
  teamController.deleteTeamMember
);

/* ===============================
   EXPORT ROUTER (ALWAYS LAST)
================================ */
module.exports = router;
