import mongoose, {Schema, type Document} from "mongoose";

enum Role {
    ADMIN = 'admin',
    MODERATOR = 'moderator',
    GUEST = 'guest',
}
export interface IMember extends Document {
    role: Role;
    profile: mongoose.Types.ObjectId;
    server: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
const MemberSchema = new Schema<IMember>({
    role: { type: String, enum: Object.values(Role), default: Role.GUEST },
    profile: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    server: { type: Schema.Types.ObjectId, ref: 'Server', required: true },
}, { timestamps: true });

export const Member = mongoose.model('Member', MemberSchema);