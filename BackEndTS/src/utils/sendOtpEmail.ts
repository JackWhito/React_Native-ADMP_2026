import nodemailer from "nodemailer";

const SUBJECT_REGISTER = "Your admin verification code";

export type OtpEmailKind =
    | "registration"
    | "password_reset"
    | "app_password_reset"
    | "app_signup"
    | "app_email_change";

/**
 * Sends a one-time code using `EMAIL_USER` / `EMAIL_PASS` from `.env` (Gmail SMTP).
 * If those vars are missing, logs the OTP to the console (local dev fallback).
 */
export async function sendOtpEmail(
    to: string,
    otp: string,
    kind: OtpEmailKind = "registration"
): Promise<void> {
    const user = process.env.EMAIL_USER?.trim();
    const pass = process.env.EMAIL_PASS?.trim();

    if (!user || !pass) {
        console.warn(
            "EMAIL_USER or EMAIL_PASS is not set; OTP will not be sent by email (console only)."
        );
        console.info(`[OTP dev fallback kind=${kind}] to=${to} code=${otp}`);
        return;
    }

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass },
    });

    const isAdminReset = kind === "password_reset";
    const isAppReset = kind === "app_password_reset";
    const isAppSignup = kind === "app_signup";
    const isAppEmailChange = kind === "app_email_change";
    const isReset = isAdminReset || isAppReset;
    const subject = isAppEmailChange
        ? "Your email change verification code"
        : isAppSignup
          ? "Verify your new account"
          : isAppReset
            ? "Your password reset code"
            : isAdminReset
              ? "Reset your admin password"
              : SUBJECT_REGISTER;
    const text = isAppEmailChange
        ? `Your email change verification code is ${otp}. It expires in 15 minutes. If you did not request this change, you can ignore this email.`
        : isAppSignup
          ? `Your sign-up verification code is ${otp}. It expires in 15 minutes. If you did not create an account, you can ignore this email.`
          : isReset
            ? `Your password reset code is ${otp}. It expires in 15 minutes. If you did not request a reset, you can ignore this email.`
            : `Your verification code is ${otp}. It expires in 15 minutes. If you did not request this, you can ignore this email.`;
    const html = isAppEmailChange
        ? `<p>Your email change verification code is <strong>${otp}</strong>.</p><p>It expires in 15 minutes.</p><p>If you did not request this change, you can ignore this email.</p>`
        : isAppSignup
          ? `<p>Your sign-up verification code is <strong>${otp}</strong>.</p><p>It expires in 15 minutes.</p><p>If you did not create an account, you can ignore this email.</p>`
          : isReset
            ? `<p>Your password reset code is <strong>${otp}</strong>.</p><p>It expires in 15 minutes.</p><p>If you did not request a reset, you can ignore this email.</p>`
            : `<p>Your verification code is <strong>${otp}</strong>.</p><p>It expires in 15 minutes.</p><p>If you did not request this, you can ignore this email.</p>`;

    await transporter.sendMail({
        from: user,
        to,
        subject,
        text,
        html,
    });
}
