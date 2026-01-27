import jwt from "jsonwebtoken"
import User from "../models/user.model.js"
import rateLimit from "express-rate-limit";

export const protectRoute = async (req, res, next) =>{
    try {
        const authHeader = req.headers.authorization;
        if(!authHeader || !authHeader.startsWith("Bearer ")){
            return res.status(401).json({message:"Unauthorized - No token(header) provided"});
        }
        const token = authHeader.split(" ")[1];

        if(!token){
            return res.status(401).json({message:"Unauthorized - No token provided"});
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        if(!decoded){
            return res.status(401).json({message:"Unauthorized - Invalid token"});
        }
        const user = await User.findById(decoded.userID).select("-password");

        if(!user){
            return res.status(401).json({message:"User not found"});
        }
        req.user = user;
        next();
    } catch (error) {
        console.log("Error in protectRoute middleware", error.message);
        res.status(500).json({message:"Internal Server Error"});
    }
};

export const adminOnly = (req, res, next) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({message:"Access denied - Admin only"});
    }
    next();
};

export const apiLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: "Too many requests from this IP, please try again after 10 minutes",
    standardHeaders: true,
    legacyHeaders: false,
});
