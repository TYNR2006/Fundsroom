import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { pool } from '../config/db';
import { AuthenticatedUser } from '../types/auth';
import { LoginInput } from '../validators/auth.validator';

type UserWithPassword = AuthenticatedUser & {
  passwordHash: string;
};

function getJwtConfiguration(): { secret: string; expiresIn: SignOptions['expiresIn'] } {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN;

  if (!secret || !expiresIn) {
    throw new Error('JWT configuration is missing');
  }

  return {
    secret,
    expiresIn: expiresIn as SignOptions['expiresIn'],
  };
}

export async function authenticateUser(input: LoginInput): Promise<{
  token: string;
  user: AuthenticatedUser;
} | null> {
  const result = await pool.query<{
    id: number;
    name: string;
    email: string;
    password_hash: string;
    role: string;
  }>(
    `SELECT
       u.id,
       u.name,
       u.email,
       u.password_hash,
       r.name AS role
     FROM users AS u
     JOIN roles AS r ON r.id = u.role_id
     WHERE LOWER(u.email) = LOWER($1)`,
    [input.email],
  );

  const databaseUser = result.rows[0];
  if (!databaseUser) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(input.password, databaseUser.password_hash);
  if (!passwordMatches) {
    return null;
  }

  const user: AuthenticatedUser = {
    userId: databaseUser.id,
    name: databaseUser.name,
    email: databaseUser.email,
    role: databaseUser.role,
  };

  const { secret, expiresIn } = getJwtConfiguration();
  const token = jwt.sign(user, secret, { expiresIn });

  return { token, user };
}
