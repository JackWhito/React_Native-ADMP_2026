import * as jose from "jose";

const getSecret = (): Uint8Array => {
    const raw = process.env.ADMIN_JWT_SECRET;
    if (!raw) {
        console.warn(
            "ADMIN_JWT_SECRET is not set; using insecure dev default. Set ADMIN_JWT_SECRET in production."
        );
    }
    return new TextEncoder().encode(raw ?? "dev-admin-jwt-secret-change-me");
};

export async function signAdminToken(adminId: string): Promise<string> {
    const secret = getSecret();
    return new jose.SignJWT({ role: "admin" })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(adminId)
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(secret);
}

export async function verifyAdminToken(token: string): Promise<jose.JWTPayload> {
    const secret = getSecret();
    const { payload } = await jose.jwtVerify(token, secret);
    return payload;
}
