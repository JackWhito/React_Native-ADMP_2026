import mongoose, { Schema, type Document } from "mongoose";

/** Pending admin signup: OTP sent to email; row removed after successful verify or TTL. */
export interface IAdminRegisterOtp extends Document {
    email: string;
    otpHash: string;
    expiresAt: Date;
}

const AdminRegisterOtpSchema = new Schema<IAdminRegisterOtp>(
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

AdminRegisterOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AdminRegisterOtp = mongoose.model("AdminRegisterOtp", AdminRegisterOtpSchema);
