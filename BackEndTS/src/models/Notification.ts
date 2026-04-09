import mongoose, { Schema, type Document } from "mongoose";

export type NotificationType = "server_invite";
export type NotificationStatus = "pending" | "accepted" | "rejected";

export interface INotification extends Document {
  type: NotificationType;
  status: NotificationStatus;
  recipient: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  server: mongoose.Types.ObjectId;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    type: { type: String, enum: ["server_invite"], required: true, default: "server_invite" },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
    recipient: { type: Schema.Types.ObjectId, ref: "Profile", required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: "Profile", required: true },
    server: { type: Schema.Types.ObjectId, ref: "Server", required: true },
    message: { type: String, default: "" },
  },
  { timestamps: true }
);

NotificationSchema.index(
  { recipient: 1, sender: 1, server: 1, type: 1, status: 1 },
  { partialFilterExpression: { status: "pending" } }
);

export const Notification = mongoose.model<INotification>("Notification", NotificationSchema);
