export type Role = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';

export type User = {
  userId: number;
  name: string;
  email: string;
  role: Role;
};

export type LoginResponse = {
  token: string;
  user: User;
};
