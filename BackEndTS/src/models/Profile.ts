import mongoose, {Schema, type Document} from "mongoose";

export interface IProfile extends Document {
    clerkId: string;
    name: string;
    imageUrl: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
}
const ProfileSchema = new Schema<IProfile>({
    clerkId: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: "" },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
}, { timestamps: true });

export const Profile = mongoose.model('Profile', ProfileSchema);