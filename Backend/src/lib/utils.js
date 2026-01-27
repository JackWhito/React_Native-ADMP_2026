import jwt from "jsonwebtoken"
export const genToken=(userID, role, res) => {
    if(!role || (role !== "user" && role !== "admin")){
        throw new Error("Invalid role provided for token generation");
    }
    const payload = {userID, role};
    const expiresIn = role === "admin" ? "12h" : "1d";

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn
    });
    return token;
};