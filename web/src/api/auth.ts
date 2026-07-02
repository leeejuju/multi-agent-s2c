import { get, post } from "./index";

export interface UserResponse {
  id: number;
  uid: string;
  username: string;
  email?: string | null;
  is_active?: boolean;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface RegisterPayload {
  email?: string;
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserResponse;
}

export const authApi = {
  login: (data: LoginPayload) => post<TokenResponse>("/auth/login", data),
  register: (data: RegisterPayload) =>
    post<UserResponse>("/auth/register", data),
  getMe: () => get<UserResponse>("/auth/me"),
};
