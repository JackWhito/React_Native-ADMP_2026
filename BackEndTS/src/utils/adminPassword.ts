export async function hashAdminPassword(plain: string): Promise<string> {
    return Bun.password.hash(plain, { algorithm: "bcrypt", cost: 10 });
}

export async function verifyAdminPassword(
    plain: string,
    passwordHash: string
): Promise<boolean> {
    return Bun.password.verify(plain, passwordHash);
}
