import mongoose from "mongoose";

export const connectDB = async () => {
    try{
        const mongoURI = process.env.MONGODB_URI;
        if(!mongoURI) {
            throw new Error("MONGODB_URI is not defined in environment variables");
        }
        await mongoose.connect(mongoURI);
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};