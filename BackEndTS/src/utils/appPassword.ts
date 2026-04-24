const MIN_PASSWORD_LENGTH = 8;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;

/** Same rules as local email sign-up. */
export function isStrongAppPassword(password: string): boolean {
    return password.length >= MIN_PASSWORD_LENGTH && passwordRegex.test(password);
}

export async function hashAppPassword(plain: string): Promise<string> {
    return Bun.password.hash(plain, { algorithm: "bcrypt", cost: 10 });
}

export async function verifyAppPassword(plain: string, passwordHash: string): Promise<boolean> {
    return Bun.password.verify(plain, passwordHash);
}
