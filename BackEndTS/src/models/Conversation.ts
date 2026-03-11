import mongoose, {Schema, type Document} from "mongoose";

export interface IConversation extends Document {
    memberOne: mongoose.Types.ObjectId;
    memberTwo: mongoose.Types.ObjectId;
}
const ConversationSchema = new Schema<IConversation>({
    memberOne: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    memberTwo: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
});

export const Conversation = mongoose.model('Conversation', ConversationSchema);