import mongoose, {Schema, type Document} from "mongoose";

export interface IServer extends Document {
    name: string;
    imageUrl: string;
    inviteCode: string;
    participants: mongoose.Types.ObjectId[];
    admins: mongoose.Types.ObjectId[];

    createdAt: Date;
    updatedAt: Date;
}
const ServerSchema = new Schema<IServer>({
    name: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: "" },
    inviteCode: { type: String, required: true, unique: true },
    participants: [{ type: Schema.Types.ObjectId, ref: 'Profile', required: true }],
    admins: [{ type: Schema.Types.ObjectId, ref: "Profile", required: true }],
}, { timestamps: true });

export const Server = mongoose.model('Server', ServerSchema);