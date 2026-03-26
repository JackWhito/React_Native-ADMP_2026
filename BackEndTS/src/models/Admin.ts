import mongoose, { Schema, type Document } from "mongoose";

export interface IAdmin extends Document {
    name: string;
    email: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
}

const AdminSchema = new Schema<IAdmin>(
    {
        name: { type: String, required: true, trim: true },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        passwordHash: { type: String, required: true, select: false },
    },
    { timestamps: true }
);

export const Admin = mongoose.model("Admin", AdminSchema);
