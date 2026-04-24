import mongoose, {Schema, type Document} from "mongoose";

export interface IServer extends Document {
    name: string;
    imageUrl: string;
    inviteCode: string;
    createdBy?: mongoose.Types.ObjectId;
    participants: mongoose.Types.ObjectId[];
    admins: mongoose.Types.ObjectId[];

    createdAt: Date;
    updatedAt: Date;
}
const ServerSchema = new Schema<IServer>({
    name: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: "" },
    inviteCode: { type: String, required: true, unique: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "Profile", required: false, index: true },
    participants: [{ type: Schema.Types.ObjectId, ref: 'Profile', required: true }],
    admins: [{ type: Schema.Types.ObjectId, ref: "Profile", required: true }],
}, { timestamps: true });

ServerSchema.index({ participants: 1 });

export const Server = mongoose.model('Server', ServerSchema);