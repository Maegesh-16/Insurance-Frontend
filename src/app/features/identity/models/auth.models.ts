export interface LoginRequest { email: string; password: string; }
export interface RegisterRequest extends LoginRequest { userName: string; }
export interface AuthResponse {
  userId: string;
  email: string;
  userName: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAtUtc: string;
  roles: string[];
  permissions: string[];
}