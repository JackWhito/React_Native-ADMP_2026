import mongoose, {Schema, type Document} from "mongoose";

export interface IDirectMessage extends Document {
    content: string;
    fileUrl: string;
    member: mongoose.Types.ObjectId;
    conversation: mongoose.Types.ObjectId;
    deleted: boolean;
    reactions: {
        emoji: string;
        users: mongoose.Types.ObjectId[];
    }[];
    createdAt: Date;
    updatedAt: Date;
}
const DirectMessageSchema = new Schema<IDirectMessage>({
    content: { type: String, default: "" },
    fileUrl: { type: String, default: "" },
    member: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    deleted: { type: Boolean, default: false },
    reactions: [{
        emoji: { type: String, required: true, trim: true, maxlength: 32 },
        users: [{ type: Schema.Types.ObjectId, ref: "Profile", required: true }],
    }],
}, { timestamps: true });

DirectMessageSchema.index({ conversation: 1, createdAt: -1 }); //newest messages first

export const DirectMessage = mongoose.model('DirectMessage', DirectMessageSchema);