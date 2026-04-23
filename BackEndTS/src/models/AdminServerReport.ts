import mongoose, { Schema, type Document } from "mongoose";

export type AdminServerReportStatus = "pending" | "resolved" | "dismissed";
export type AdminServerReportCategory = "spam" | "harassment" | "hate" | "nudity" | "violence" | "scam" | "other";

export interface IAdminServerReport extends Document {
    server: mongoose.Types.ObjectId;
    reportedBy: mongoose.Types.ObjectId;
    reason: string;
    category: AdminServerReportCategory;
    details?: string;
    status: AdminServerReportStatus;
    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const AdminServerReportSchema = new Schema<IAdminServerReport>(
    {
        server: { type: Schema.Types.ObjectId, ref: "Server", required: true, index: true },
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

AdminServerReportSchema.index({ status: 1, createdAt: -1 });
AdminServerReportSchema.index({ category: 1, status: 1, createdAt: -1 });
AdminServerReportSchema.index({ server: 1, status: 1, createdAt: -1 });

export const AdminServerReport = mongoose.model<IAdminServerReport>("AdminServerReport", AdminServerReportSchema);
