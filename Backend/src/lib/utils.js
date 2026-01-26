import jwt from "jsonwebtoken"
export const genToken=(userID, res) => {
    const token = jwt.sign({userID}, process.env.JWT_SECRET, {
        expiresIn:"1d"
    });
    res.cookie("jwt", token, {
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: "strict",
        secure: process.env.NODE_ENV !== "development"
    });

    return token;
};