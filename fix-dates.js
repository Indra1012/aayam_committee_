require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('./models/Event');

async function fixDates() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const events = await Event.find({ type: 'upcoming' });
  console.log(`Found ${events.length} upcoming events to fix`);
  
  for (const event of events) {
    const dateStr = event.endDate.toISOString().split('T')[0];
    event.endDate = new Date(dateStr + 'T23:59:59+05:30');
    await event.save();
    console.log(`Fixed: ${event.title} → endDate now ${event.endDate}`);
  }
  
  console.log('Done!');
  mongoose.disconnect();
}

fixDates().catch(console.error);