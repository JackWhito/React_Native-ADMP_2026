import mongoose, { type Document, Schema } from "mongoose";

export interface ILocalPasswordResetOtp extends Document {
    email: string;
    otp: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const LocalPasswordResetOtpSchema = new Schema<ILocalPasswordResetOtp>(
    {
        email: { type: String, required: true, lowercase: true, trim: true, index: true },
        otp: { type: String, required: true },
        expiresAt: { type: Date, required: true, index: true },
    },
    { timestamps: true }
);

LocalPasswordResetOtpSchema.index({ email: 1, otp: 1 });

export const LocalPasswordResetOtp = mongoose.model<ILocalPasswordResetOtp>(
    "LocalPasswordResetOtp",
    LocalPasswordResetOtpSchema
);
