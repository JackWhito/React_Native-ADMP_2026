import mongoose, {Schema, type Document} from "mongoose";

export interface IProfile extends Document {
    clerkId: string;
    name: string;
    username?: string;
    bio?: string;
    imageUrl: string;
    email: string;
    role: "user" | "moderator" | "admin";
    moderationStatus: "active" | "suspended" | "banned" | "shadow_banned";
    moderationReason?: string;
    suspendedUntil?: Date;
    forceLogoutAfter?: Date;
    sessionVersion: number;
    blockedProfiles: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}
const ProfileSchema = new Schema<IProfile>({
    clerkId: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    bio: { type: String, default: "", trim: true, maxlength: 300 },
    imageUrl: { type: String, default: "" },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, enum: ["user", "moderator", "admin"], default: "user", index: true },
    moderationStatus: {
        type: String,
        enum: ["active", "suspended", "banned", "shadow_banned"],
        default: "active",
        index: true,
    },
    moderationReason: { type: String, default: "", trim: true, maxlength: 500 },
    suspendedUntil: { type: Date, required: false },
    forceLogoutAfter: { type: Date, required: false },
    sessionVersion: { type: Number, default: 1 },
    blockedProfiles: [{ type: Schema.Types.ObjectId, ref: "Profile", default: [] }],
}, { timestamps: true });

export const Profile = mongoose.model('Profile', ProfileSchema);