import { post } from "./http"

export interface AuthUser {
  id: number
  fullname: string
  email: string
  avatarUrl: string | null
}

export interface RegisterInput {
  fullname: string
  email: string
  password: string
  confirmPassword: string
}

export const authApi = {
  register: (input: RegisterInput) => post<{ user: AuthUser }>("/auth/register", input),
  login: (input: { email: string; password: string }) => post<{ user: AuthUser }>("/auth/login", input),
  logout: () => post<{ message: string }>("/auth/logout"),
}
