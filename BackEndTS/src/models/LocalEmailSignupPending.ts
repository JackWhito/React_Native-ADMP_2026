import mongoose, { type Document, Schema } from "mongoose";

/**
 * In-flight email/password sign-up before OTP verification; no Profile row yet.
 */
export interface ILocalEmailSignupPending extends Document {
    email: string;
    passwordHash: string;
    name: string;
    otp: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const LocalEmailSignupPendingSchema = new Schema<ILocalEmailSignupPending>(
    {
        email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
        passwordHash: { type: String, required: true },
        name: { type: String, required: true, trim: true },
        otp: { type: String, required: true },
        expiresAt: { type: Date, required: true, index: true },
    },
    { timestamps: true }
);

LocalEmailSignupPendingSchema.index({ email: 1, otp: 1 });

export const LocalEmailSignupPending = mongoose.model<ILocalEmailSignupPending>(
    "LocalEmailSignupPending",
    LocalEmailSignupPendingSchema
);
