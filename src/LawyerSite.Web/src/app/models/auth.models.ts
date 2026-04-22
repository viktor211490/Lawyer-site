export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  username: string;
  email: string;
  fullName: string;
}
