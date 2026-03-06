
require("dotenv").config();
const mongoose = require("mongoose");
const Event = require("./models/Event");

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  // Fix 1: isPublic field doesn't exist at all
  const r1 = await Event.updateMany(
    { isPublic: { $exists: false } },
    { $set: { isPublic: true } }
  );
  console.log(`Fixed ${r1.modifiedCount} events with missing isPublic field`);

  // Fix 2: isPublic is null
  const r2 = await Event.updateMany(
    { isPublic: null },
    { $set: { isPublic: true } }
  );
  console.log(`Fixed ${r2.modifiedCount} events with null isPublic`);

  // Show summary
  const total = await Event.countDocuments();
  const pub   = await Event.countDocuments({ isPublic: true });
  const priv  = await Event.countDocuments({ isPublic: false });
  console.log(`\nSummary: ${total} total | ${pub} public | ${priv} private`);

  // Also list any events still showing as private (so you can manually fix if needed)
  const privateEvents = await Event.find({ isPublic: false }).select("title type").lean();
  if (privateEvents.length > 0) {
    console.log("\nEvents explicitly marked as PRIVATE (these are intentional):");
    privateEvents.forEach(e => console.log(`  - [${e.type}] ${e.title}`));
  }

  await mongoose.disconnect();
  console.log("\nMigration complete!");
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});