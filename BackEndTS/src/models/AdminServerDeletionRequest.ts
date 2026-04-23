import mongoose, { Schema, type Document } from "mongoose";

export interface IAdminServerDeletionRequest extends Document {
    server: mongoose.Types.ObjectId;
    reason: string;
    requestedBy?: string;
    requestedAt: Date;
    executeAt: Date;
}

const AdminServerDeletionRequestSchema = new Schema<IAdminServerDeletionRequest>(
    {
        server: { type: Schema.Types.ObjectId, ref: "Server", required: true, unique: true, index: true },
        reason: { type: String, required: true, trim: true, maxlength: 500 },
        requestedBy: { type: String, required: false, trim: true },
        requestedAt: { type: Date, required: true },
        executeAt: { type: Date, required: true, index: true },
    },
    { timestamps: true }
);

export const AdminServerDeletionRequest = mongoose.model<IAdminServerDeletionRequest>(
    "AdminServerDeletionRequest",
    AdminServerDeletionRequestSchema
);
