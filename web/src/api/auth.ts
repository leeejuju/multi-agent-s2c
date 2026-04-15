import { post, get } from "./index";

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  is_active: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserResponse;
}

export const authApi = {
  login: (data: any) => post<TokenResponse>("/auth/login", data),
  register: (data: any) => post<UserResponse>("/auth/register", data),
  getMe: () => get<UserResponse>("/auth/me"),
};
