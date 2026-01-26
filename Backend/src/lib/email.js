import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const testAccount = await nodemailer.createTestAccount();

export const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export const sendOTPEmail = async (email, otp) => {
    const info = await transporter.sendMail({
        from: `"MitoAdmin" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your OTP Code",
        html: `<p>Your OTP code is: <b>${otp}</b></p><p>This code will expire in 5 minutes.</p>`,
    });
    console.log("OTP email sent to:", info.messageId);
};
