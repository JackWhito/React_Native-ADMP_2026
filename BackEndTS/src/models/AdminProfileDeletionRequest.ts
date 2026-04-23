import mongoose, { Schema, type Document } from "mongoose";

export interface IAdminProfileDeletionRequest extends Document {
    profile: mongoose.Types.ObjectId;
    reason: string;
    requestedBy?: string;
    requestedAt: Date;
    executeAt: Date;
    cancellationRequested: boolean;
    cancellationReason?: string;
    cancellationRequestedAt?: Date;
}

const AdminProfileDeletionRequestSchema = new Schema<IAdminProfileDeletionRequest>(
    {
        profile: { type: Schema.Types.ObjectId, ref: "Profile", required: true, unique: true, index: true },
        reason: { type: String, required: true, trim: true, maxlength: 500 },
        requestedBy: { type: String, required: false, trim: true },
        requestedAt: { type: Date, required: true },
        executeAt: { type: Date, required: true, index: true },
        cancellationRequested: { type: Boolean, default: false, index: true },
        cancellationReason: { type: String, required: false, trim: true, maxlength: 500 },
        cancellationRequestedAt: { type: Date, required: false },
    },
    { timestamps: true }
);

export const AdminProfileDeletionRequest = mongoose.model<IAdminProfileDeletionRequest>(
    "AdminProfileDeletionRequest",
    AdminProfileDeletionRequestSchema
);
