import mongoose, { Schema, type Document } from "mongoose";

export type AdminReportStatus = "pending" | "resolved" | "dismissed";
export type AdminReportCategory = "spam" | "harassment" | "hate" | "nudity" | "violence" | "scam" | "other";

export interface IAdminMessageReport extends Document {
    message: mongoose.Types.ObjectId;
    reportedBy: mongoose.Types.ObjectId;
    reason: string;
    category: AdminReportCategory;
    details?: string;
    status: AdminReportStatus;
    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const AdminMessageReportSchema = new Schema<IAdminMessageReport>(
    {
        message: { type: Schema.Types.ObjectId, ref: "Message", required: true, index: true },
        reportedBy: { type: Schema.Types.ObjectId, ref: "Profile", required: true, index: true },
        reason: { type: String, required: true, trim: true, maxlength: 300 },
        category: {
            type: String,
            enum: ["spam", "harassment", "hate", "nudity", "violence", "scam", "other"],
            default: "other",
            index: true,
        },
        details: { type: String, default: "", trim: true, maxlength: 1000 },
        status: {
            type: String,
            enum: ["pending", "resolved", "dismissed"],
            default: "pending",
            index: true,
        },
        reviewedBy: { type: Schema.Types.ObjectId, ref: "Admin", required: false },
        reviewedAt: { type: Date, required: false },
    },
    { timestamps: true }
);

AdminMessageReportSchema.index({ status: 1, createdAt: -1 });
AdminMessageReportSchema.index({ category: 1, status: 1, createdAt: -1 });
AdminMessageReportSchema.index({ message: 1, status: 1, createdAt: -1 });

export const AdminMessageReport = mongoose.model<IAdminMessageReport>("AdminMessageReport", AdminMessageReportSchema);
