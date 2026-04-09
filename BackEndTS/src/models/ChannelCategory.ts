import mongoose, { Schema, type Document } from "mongoose";

export interface IChannelCategory extends Document {
  name: string;
  server: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ChannelCategorySchema = new Schema<IChannelCategory>(
  {
    name: { type: String, required: true, trim: true },
    server: { type: Schema.Types.ObjectId, ref: "Server", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "Profile", required: true },
  },
  { timestamps: true }
);

ChannelCategorySchema.index({ server: 1, name: 1 }, { unique: true });

export const ChannelCategory = mongoose.model<IChannelCategory>(
  "ChannelCategory",
  ChannelCategorySchema
);
