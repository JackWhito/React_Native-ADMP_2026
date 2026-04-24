import mongoose, { Schema, type Document } from "mongoose";

export type NotificationType =
  | "server_invite"
  | "server_message"
  | "mention_message"
  | "friend_invite"
  | "account_deletion_warning";
export type NotificationStatus = "pending" | "accepted" | "rejected" | "cancel_requested";

export interface INotification extends Document {
  type: NotificationType;
  status: NotificationStatus;
  isRead: boolean;
  readAt?: Date | null;
  recipient: mongoose.Types.ObjectId;
  sender?: mongoose.Types.ObjectId;
  server?: mongoose.Types.ObjectId;
  channel?: mongoose.Types.ObjectId;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    type: {
      type: String,
      enum: ["server_invite", "server_message", "mention_message", "friend_invite", "account_deletion_warning"],
      required: true,
      default: "server_invite",
    },
    status: { type: String, enum: ["pending", "accepted", "rejected", "cancel_requested"], default: "pending" },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    recipient: { type: Schema.Types.ObjectId, ref: "Profile", required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: "Profile", required: false },
    server: { type: Schema.Types.ObjectId, ref: "Server", required: false },
    channel: { type: Schema.Types.ObjectId, ref: "Channel", required: false },
    message: { type: String, default: "" },
  },
  { timestamps: true }
);

NotificationSchema.index(
  { recipient: 1, sender: 1, server: 1, type: 1, status: 1 },
  { partialFilterExpression: { status: "pending" } }
);
NotificationSchema.index({ recipient: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>("Notification", NotificationSchema);
