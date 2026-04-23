import mongoose, {Schema, type Document} from "mongoose";

export interface IMessage extends Document {
    content: string;
    fileUrl: string;
    member: mongoose.Types.ObjectId;
    channel: mongoose.Types.ObjectId;
    deleted: boolean;
    reactions: {
        emoji: string;
        users: mongoose.Types.ObjectId[];
    }[];
    createdAt: Date;
    updatedAt: Date;
}
const MessageSchema = new Schema<IMessage>({
    content: { type: String, default: "" },
    fileUrl: { type: String, default: "" },
    member: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    channel: { type: Schema.Types.ObjectId, ref: 'Channel', required: true },
    deleted: { type: Boolean, default: false },
    reactions: [{
        emoji: { type: String, required: true, trim: true, maxlength: 32 },
        users: [{ type: Schema.Types.ObjectId, ref: "Profile", required: true }],
    }],
}, { timestamps: true });

MessageSchema.index({ channel: 1, createdAt: -1 }); //newest messages first

export const Message = mongoose.model('Message', MessageSchema);