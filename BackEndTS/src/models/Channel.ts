import mongoose, {Schema, type Document} from "mongoose";

enum ChannelType {
    TEXT = 'text',
    AUDIO = 'audio',
    VIDEO = 'video',
}
export interface IChannel extends Document {
    name: string;
    type: ChannelType;
    profile: mongoose.Types.ObjectId[];
    server: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
const ChannelSchema = new Schema<IChannel>({
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: Object.values(ChannelType), default: ChannelType.TEXT },
    profile: [{ type: Schema.Types.ObjectId, ref: 'Profile', required: true }],
    server: { type: Schema.Types.ObjectId, ref: 'Server', required: true },
}, { timestamps: true });

export const Channel = mongoose.model('Channel', ChannelSchema);