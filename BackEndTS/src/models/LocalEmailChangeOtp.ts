import mongoose, { type Document, Schema } from "mongoose";

/**
 * Confirms a new sign-in email for an existing `authProvider: "email"` account.
 */
export interface ILocalEmailChangeOtp extends Document {
    profile: mongoose.Types.ObjectId;
    newEmail: string;
    otp: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const LocalEmailChangeOtpSchema = new Schema<ILocalEmailChangeOtp>(
    {
        profile: { type: Schema.Types.ObjectId, ref: "Profile", required: true, index: true },
        newEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
        otp: { type: String, required: true },
        expiresAt: { type: Date, required: true, index: true },
    },
    { timestamps: true }
);

LocalEmailChangeOtpSchema.index({ profile: 1, newEmail: 1 });

export const LocalEmailChangeOtp = mongoose.model<ILocalEmailChangeOtp>(
    "LocalEmailChangeOtp",
    LocalEmailChangeOtpSchema
);
