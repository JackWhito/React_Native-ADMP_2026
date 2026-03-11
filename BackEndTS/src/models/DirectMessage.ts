import mongoose, {Schema, type Document} from "mongoose";

export interface IDirectMessage extends Document {
    content: string;
    fileUrl: string;
    member: mongoose.Types.ObjectId;
    conversation: mongoose.Types.ObjectId;
    deleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}
const DirectMessageSchema = new Schema<IDirectMessage>({
    content: { type: String, required: true },
    fileUrl: { type: String, default: "" },
    member: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    deleted: { type: Boolean, default: false },
}, { timestamps: true });

DirectMessageSchema.index({ conversation: 1, createdAt: 1 }); //oldest messages first

export const DirectMessage = mongoose.model('DirectMessage', DirectMessageSchema);