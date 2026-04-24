import mongoose, {Schema, type Document} from "mongoose";

export interface IConversation extends Document {
    memberOne: mongoose.Types.ObjectId;
    memberTwo: mongoose.Types.ObjectId;
    lastMessage: mongoose.Types.ObjectId | null;    
    lastMessageAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
const ConversationSchema = new Schema<IConversation>({
    memberOne: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    memberTwo: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    lastMessage: { type: Schema.Types.ObjectId, ref: 'DirectMessage', default: null },
    lastMessageAt: { type: Date, default: Date.now },
}, { timestamps: true });

ConversationSchema.index({ memberOne: 1, lastMessageAt: -1 });
ConversationSchema.index({ memberTwo: 1, lastMessageAt: -1 });

export const Conversation = mongoose.model('Conversation', ConversationSchema);