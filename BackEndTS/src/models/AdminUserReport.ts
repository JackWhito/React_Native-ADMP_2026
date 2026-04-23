import mongoose, { Schema, type Document } from "mongoose";

export type AdminUserReportStatus = "pending" | "resolved" | "dismissed";
export type AdminUserReportCategory = "spam" | "harassment" | "hate" | "nudity" | "violence" | "scam" | "other";

export interface IAdminUserReport extends Document {
    profile: mongoose.Types.ObjectId;
    reportedBy: mongoose.Types.ObjectId;
    reason: string;
    category: AdminUserReportCategory;
    details?: string;
    status: AdminUserReportStatus;
    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const AdminUserReportSchema = new Schema<IAdminUserReport>(
    {
        profile: { type: Schema.Types.ObjectId, ref: "Profile", required: true, index: true },
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

AdminUserReportSchema.index({ status: 1, createdAt: -1 });
AdminUserReportSchema.index({ category: 1, status: 1, createdAt: -1 });
AdminUserReportSchema.index({ profile: 1, status: 1, createdAt: -1 });

export const AdminUserReport = mongoose.model<IAdminUserReport>("AdminUserReport", AdminUserReportSchema);
