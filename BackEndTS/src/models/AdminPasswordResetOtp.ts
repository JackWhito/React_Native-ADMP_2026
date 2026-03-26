import mongoose, { Schema, type Document } from "mongoose";

/** Pending admin password reset: OTP sent to email; removed after verify or TTL. */
export interface IAdminPasswordResetOtp extends Document {
    email: string;
    otpHash: string;
    expiresAt: Date;
}

const AdminPasswordResetOtpSchema = new Schema<IAdminPasswordResetOtp>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        otpHash: { type: String, required: true },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true }
);

AdminPasswordResetOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AdminPasswordResetOtp = mongoose.model("AdminPasswordResetOtp", AdminPasswordResetOtpSchema);
