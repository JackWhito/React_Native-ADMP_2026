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

