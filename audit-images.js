require("dotenv").config();
const mongoose = require("mongoose");
const Event    = require("./models/Event");
const SubEvent = require("./models/SubEvent");

async function audit() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log("Connected to MongoDB\n");

  const events = await Event.find().lean();
  let brokenCount = 0;

  console.log("=== EVENTS WITH BROKEN (LOCAL) IMAGES ===\n");

  for (const e of events) {
    const issues = [];

    if (e.bannerImage && !e.bannerImage.startsWith("http")) {
      issues.push(`  bannerImage: ${e.bannerImage}`);
    }

    const brokenGallery = (e.galleryImages || []).filter(
      img => img.url && !img.url.startsWith("http")
    );
    if (brokenGallery.length > 0) {
      issues.push(`  galleryImages (${brokenGallery.length} broken):`);
      brokenGallery.forEach(img => issues.push(`    - ${img.url}`));
    }

    if (issues.length > 0) {
      brokenCount++;
      console.log(`[${e.type.toUpperCase()}] "${e.title}" (ID: ${e._id})`);
      issues.forEach(i => console.log(i));
      console.log();
    }
  }

  console.log("=== SUBEVENTS WITH BROKEN IMAGES ===\n");

  const subEvents = await SubEvent.find().lean();
  for (const sub of subEvents) {
    const issues = [];
    if (sub.qrImage && !sub.qrImage.startsWith("http")) {
      issues.push(`  qrImage: ${sub.qrImage}`);
    }
    if (sub.posterImage && !sub.posterImage.startsWith("http")) {
      issues.push(`  posterImage: ${sub.posterImage}`);
    }
    if (issues.length > 0) {
      console.log(`SubEvent: "${sub.title}" (ID: ${sub._id})`);
      issues.forEach(i => console.log(i));
      console.log();
    }
  }

  console.log(`\n=== TOTAL EVENTS WITH BROKEN IMAGES: ${brokenCount} ===`);
  console.log("\nTo fix: Go to Edit Event and re-upload the banner/gallery images.");
  console.log("Or re-deploy the original uploads/ folder to your server.\n");

  await mongoose.disconnect();
}

audit().catch(err => {
  console.error("Audit failed:", err);
  process.exit(1);
});