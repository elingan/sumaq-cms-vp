import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

export async function hashUserPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyUserPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
