import mongoose, { Schema } from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        chat:{
            type: Schema.Types.ObjectId,
            ref:"Chat",
            required: true
        },
        sender:{
            type: Schema.Types.ObjectId,
            ref:"User",
            required: true
        },
        text:{
            type: String,
            trim: true
        },
        image:{
            type: String
        },
        links:{
            type: [String],
            default:[]
        }
    },
    {timestamps: true}
);
messageSchema.index({chat:1, createdAt:1});

const Message = mongoose.model("Message", messageSchema);
export default Message