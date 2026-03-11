import mongoose, {Schema, type Document} from "mongoose";

export interface IMessage extends Document {
    content: string;
    fileUrl: string;
    member: mongoose.Types.ObjectId;
    channel: mongoose.Types.ObjectId;
    deleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}
const MessageSchema = new Schema<IMessage>({
    content: { type: String, required: true },
    fileUrl: { type: String, default: "" },
    member: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    channel: { type: Schema.Types.ObjectId, ref: 'Channel', required: true },
    deleted: { type: Boolean, default: false },
}, { timestamps: true });

MessageSchema.index({ channel: 1, createdAt: 1 }); //oldest messages first

export const Message = mongoose.model('Message', MessageSchema);