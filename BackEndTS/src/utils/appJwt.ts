import * as jose from "jose";

const getSecret = (): Uint8Array => {
    const raw = process.env.APP_JWT_SECRET;
    if (!raw) {
        console.warn(
            "APP_JWT_SECRET is not set; using insecure dev default. Set APP_JWT_SECRET in production."
        );
    }
    return new TextEncoder().encode(raw ?? "dev-app-jwt-secret-change-in-production");
};

const ISSUER = "admp-app";
const AUDIENCE = "admp-app-users";

export async function signAppToken(profileId: string, sessionVersion: number): Promise<string> {
    const secret = getSecret();
    return new jose
        .SignJWT({ v: sessionVersion, typ: "app" })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(profileId)
        .setIssuedAt()
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setExpirationTime("30d")
        .sign(secret);
}

export async function verifyAppToken(token: string): Promise<jose.JWTPayload> {
    const secret = getSecret();
    const { payload } = await jose.jwtVerify(token, secret, {
        issuer: ISSUER,
        audience: AUDIENCE,
    });
    return payload;
}
