/**
 * Removes all documents from the notifications collection (clean start).
 * Usage: from BackEndTS directory, with MONGODB_URI set (e.g. via .env):
 *   bun run clear-notifications
 */
import mongoose from "mongoose";
import { Notification } from "../src/models/Notification";

const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
  console.error("MONGODB_URI is not set");
  process.exit(1);
}

await mongoose.connect(mongoURI);
const result = await Notification.deleteMany({});
console.log(`Deleted ${result.deletedCount} notification document(s).`);
await mongoose.disconnect();
process.exit(0);
