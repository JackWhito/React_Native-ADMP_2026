import User from "../models/user.model.js";

export const signup = async (req, res) => {
    const {fullName, email, password} = req.body
    try{
        if(!fullName || !email || !password){
            return res.status(400).json({message:"All fields are required"});
        }
        if(password.length < 6){
            return res.status(400).json({message:"Password must be at least 6 characters"});
        }

        const user = await User.findOne({email})

        if(user) return res.status(400).json({message: "Email have already exists"});

        const newUser = new User({
            fullName,
            email,
            password
        })

        if(newUser) {
            await newUser.save();
            res.status(201).json({
                _id: newUser._id,
                fullName: newUser.fullName,
                email: newUser.email
            })
        } else {
            res.status(400).json({message:"Invalid user data"});
        }
        
    } catch(error){
        console.log("Error in signup controller", error.message);
        res.status(500).json({message: "Internal Server Error"});
    }
};
export const login = async (req, res) => {
    const {email, password} =  req.body;
    try {
        const user = await User.findOne({email});

        if(!user){
            return res.status(400).json({message:"Invalid credentials"});
        }
    
        const accPass = user.password;
        const isPassCorrect = accPass === password;
        if(!isPassCorrect){
            return res.status(400).json({message:"Invalid credentials"});
        }

        res.status(200).json({
            _id:user._id,
            fullName: user.fullName,
            email: user.email
        })
    } catch (error) {
        console.log("Error in login controller", error.message);
        res.status(500).json({message:"Internal Server Error"});
    }
};

import bcrypt from "bcryptjs";
import { genToken } from "../lib/utils.js";

export const signupJWT = async (req, res) => {
    const {fullName, email, password} = req.body
    try{
        if(!fullName || !email || !password){
            return res.status(400).json({message:"All fields are required"});
        }
        if(password.length < 6){
            return res.status(400).json({message:"Password must be at least 6 characters"});
        }

        const user = await User.findOne({email})

        if(user) return res.status(400).json({message: "Email have already exists"});

        const salt = await bcrypt.genSalt(10)
        const hashedPass = await bcrypt.hash(password, salt)

        const newUser = new User({
            fullName,
            email,
            password: hashedPass
        })

        if(newUser) {
            genToken(newUser._id, res)
            await newUser.save();
            res.status(201).json({
                _id: newUser._id,
                fullName: newUser.fullName,
                email: newUser.email
            })
        } else {
            res.status(400).json({message:"Invalid user data"});
        }
    } catch(error){
        console.log("Error in signup controller", error.message);
        res.status(500).json({message: "Internal Server Error"});
    }
};
export const loginJWT = async (req, res) => {
    const {email, password} =  req.body;
    try {
        const user = await User.findOne({email});

        if(!user){
            return res.status(400).json({message:"Invalid credentials"});
        }
    
        const isPassCorrect = await bcrypt.compare(password,user.password);
        if(!isPassCorrect){
            return res.status(400).json({message:"Invalid credentials"});
        }

        genToken(user._id, res)

        res.status(200).json({
            _id:user._id,
            fullName: user.fullName,
            email: user.email
        })
    } catch (error) {
        console.log("Error in login controller", error.message);
        res.status(500).json({message:"Internal Server Error"});
    }
};
export const logout = (req, res) => {
    try {
        res.cookie("jwt","",{maxAge:0});
        res.status(200).json({message:"Logged out successfully"});
    } catch (error) {
        console.log("Error in logout controller", error.message);
        res.status(500).json({message:"Internal Server Error"});
    }
};
export const checkAuth = (req, res) => {
    try {
        res.status(200).json(req.user);
    } catch (error) {
        console.log("Error in checkAuth controller", error.message);
        res.status(500).json({message:"Internal Server Error"})
    }
};
