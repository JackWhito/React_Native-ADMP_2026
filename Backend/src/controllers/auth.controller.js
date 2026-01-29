import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { generateOTP, sendOTPEmail } from "../lib/email.js";
import { genToken } from "../lib/utils.js";

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

        const otp = generateOTP();

        const salt = await bcrypt.genSalt(10)
        const hashedPass = await bcrypt.hash(password, salt)

        const newUser = new User({
            fullName,
            email,
            password: hashedPass,
            otp,
            otpExpiry: Date.now() + 5 * 60 * 1000 ,
            isVerified: false
        });

        if(newUser) {
            await newUser.save();
            await sendOTPEmail(email, otp);
            res.status(201).json({
                _id: newUser._id,
                fullName: newUser.fullName,
                email: newUser.email,
                message: "Signup successful, OTP sent to email"
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

        if(!user.isVerified){
            return res.status(400).json({message:"Email not verified"});
        }

        const token = genToken(user._id, user.role)

        res.status(200).json({
            _id:user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            token
        })
    } catch (error) {
        console.log("Error in loginJWT controller", error.message);
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

export const verifyOTP = async (req, res) => {
    try{
        const {email, otp} = req.body;
        const user = await User.findOne({email});

        if(!user){
            return res.status(400).json({message:"Invalid user"});
        }

        if(user.isVerified){
            return res.status(400).json({message:"User already verified"});
        }

        if(user.otp !== otp || user.otpExpiry < Date.now()){
            return res.status(400).json({message:"Invalid or expired OTP"});
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        genToken(user._id,"user", res);

        res.status(200).json({
            _id:user._id,
            fullName: user.fullName,
            email: user.email
        })
    } catch(error){
        console.log("Error in verifyOTP controller", error.message);
        res.status(500).json({message:"Internal Server Error"});
    }
};

export const resendOTP = async (req, res) => {
    try{
        const {email} = req.body;
        const user = await User.findOne({email});

        if(!user){
            return res.status(400).json({message:"Invalid user"});
        }
        if(user.isVerified){
            return res.status(400).json({message:"User already verified"});
        }   
        const otp = generateOTP();
        user.otp = otp;
        user.otpExpiry = Date.now() + 5 * 60 * 1000 ;
        await user.save()
        await sendOTPEmail(email, otp);

        res.status(200).json({message:"OTP resent to email"});
    } catch(error){
        console.log("Error in resendOTP controller", error.message);
        res.status(500).json({message:"Internal Server Error"});
    }
};

export const forgotPassword = async (req, res) => {
    try{
        const {email} = req.body;
        const user = await User.findOne({email});
        if(!user){
            return res.status(400).json({message:"Invalid user"});
        }
        user.isVerified = false;
        const otp = generateOTP();
        user.otp = otp;
        user.otpExpiry = Date.now() + 5 * 60 * 1000 ;
        await user.save()
        await sendOTPEmail(email, otp); 
        res.status(200).json({message:"OTP sent to email"});
    } catch(error){
        console.log("Error in forgotPassword controller", error.message);
        res.status(500).json({message:"Internal Server Error"});
    }
};

export const resetPassword = async (req, res) => {
    try{
        const {userId, newPassword} = req.body;
        const user = await User.findById(userId);
        if(!user){
            return res.status(400).json({message:"Invalid user"});
        }
        const salt = await bcrypt.genSalt(10)
        const hashedPass = await bcrypt.hash(newPassword, salt)
        user.password = hashedPass;
        await user.save();
        res.status(200).json({
            _id:user._id,
            fullName: user.fullName,
            email: user.email
        });
    } catch(error){
        console.log("Error in resetPassword controller", error.message);
        res.status(500).json({message:"Internal Server Error"});
    }
};

export const updateUser = async (req, res) => {
    const {userId, fullName } = req.body
    try {
        const user = await User.findById(userId);
        if(!user){
            return res.status(400).json({message:"Invalid user"});
        }
        user.fullName = fullName
        await user.save();
        const token = genToken(user._id, user.role)
        res.status(200).json({
            _id:user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            token
        })
    } catch (error) {       
        console.log("Error in updateUser controller", error.message);
        res.status(500).json({message:"Internal Server Error"});    
    }
};