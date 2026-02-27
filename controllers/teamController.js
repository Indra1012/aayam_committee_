const TeamSection = require("../models/TeamSection");
const TeamMember = require("../models/TeamMember");

/* ===============================
   VIEW TEAM PAGE
================================ */
const getTeamPage = async (req, res) => {
  try {
    const sections = await TeamSection.find().lean();

    for (let section of sections) {
      section.members = await TeamMember.find({
        section: section._id,
      });
    }

    res.render("team", { sections });
  } catch (err) {
    console.error("Get Team Page Error:", err);
    res.redirect("/");
  }
};

/* ===============================
   ADD TEAM SECTION (ADMIN)
================================ */
const addTeamSection = async (req, res) => {
  try {
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.redirect("/team");
    }

    await TeamSection.create({ title: title.trim() });

    res.redirect("/team");
  } catch (err) {
    console.error("Add Team Section Error:", err);
    res.redirect("/team");
  }
};

/* ===============================
   EDIT TEAM SECTION (VIEW)
================================ */
const getEditSection = async (req, res) => {
  try {
    const section = await TeamSection.findById(req.params.id);
    if (!section) return res.redirect("/team");

    res.render("editSection", { section });
  } catch (err) {
    console.error("Edit Section View Error:", err);
    res.redirect("/team");
  }
};

/* ===============================
   UPDATE TEAM SECTION
================================ */
const updateSection = async (req, res) => {
  try {
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.redirect("/team");
    }

    await TeamSection.findByIdAndUpdate(req.params.id, {
      title: title.trim(),
    });

    res.redirect("/team");
  } catch (err) {
    console.error("Update Section Error:", err);
    res.redirect("/team");
  }
};


/* ===============================
   ADD TEAM MEMBER (ADMIN)
================================ */
const addTeamMember = async (req, res) => {
  try {
    const { name, sectionId } = req.body;

    if (!name || !sectionId || !req.file) {
      console.log("Missing fields:", req.body);
      return res.redirect("/team");
    }

    const imagePath = `/uploads/team/${req.file.filename}`;

    await TeamMember.create({
      name: name.trim(),
      image: imagePath,
      section: sectionId,
    });

    res.redirect("/team");
  } catch (error) {
    console.error("Add Team Member Error:", error);
    res.redirect("/team");
  }
};
/* ===============================
   GET EDIT MEMBER PAGE
================================ */
const getEditMember = async (req, res) => {
  try {
    const member = await TeamMember.findById(req.params.id);
    if (!member) return res.redirect("/team");

    res.render("editMember", { member });
  } catch (error) {
    console.error("Get Edit Member Error:", error);
    res.redirect("/team");
  }
};

/* ===============================
   UPDATE TEAM MEMBER
================================ */
const updateMember = async (req, res) => {
  try {
    const { name } = req.body;
    const member = await TeamMember.findById(req.params.id);

    if (!member) return res.redirect("/team");

    // Update name
    member.name = name.trim();

    // Update image ONLY if new one uploaded
    if (req.file) {
      member.image = `/uploads/team/${req.file.filename}`;
    }

    await member.save();
    res.redirect("/team");
  } catch (err) {
    console.error("Update Member Error:", err);
    res.redirect("/team");
  }
};


/* ===============================
   DELETE TEAM MEMBER (ADMIN)
================================ */
const deleteTeamMember = async (req, res) => {
  try {
    const { id } = req.params;

    await TeamMember.findByIdAndDelete(id);

    res.redirect("/team");
  } catch (error) {
    console.error("Delete Team Member Error:", error);
    res.redirect("/team");
  }
};
/* ===============================
   DELETE TEAM SECTION (ADMIN)
================================ */
const deleteTeamSection = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete all members under this section
    await TeamMember.deleteMany({ section: id });

    // Delete section
    await TeamSection.findByIdAndDelete(id);

    res.redirect("/team");
  } catch (error) {
    console.error("Delete Team Section Error:", error);
    res.redirect("/team");
  }
};



module.exports = {
  getTeamPage,
  addTeamSection,
  addTeamMember,
  getEditSection,
  updateSection,
  getEditMember,
  updateMember,

  deleteTeamMember,
  deleteTeamSection,
};
