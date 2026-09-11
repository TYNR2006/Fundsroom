import bcrypt from 'bcryptjs';
import { pool } from '../config/db';
import type { UserCreateInput } from '../validators/user.validator';

export async function listUsers() {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, r.name AS role
     FROM users AS u JOIN roles AS r ON r.id = u.role_id
     ORDER BY u.id ASC`,
  );
  return result.rows;
}

export async function createUser(input: UserCreateInput) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role_id)
     SELECT $1, $2, $3, r.id FROM roles AS r WHERE r.name = $4
     RETURNING id, name, email, role_id`,
    [input.name, input.email, passwordHash, input.role],
  );
  if (!result.rows[0]) return null;
  const user = await pool.query(
    `SELECT u.id, u.name, u.email, r.name AS role
     FROM users AS u JOIN roles AS r ON r.id = u.role_id WHERE u.id = $1`,
    [result.rows[0].id],
  );
  return user.rows[0];
}
