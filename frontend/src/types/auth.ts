export interface User {
  id: string
  email: string
  username: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  username: string
  password: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: User
}

export interface RefreshTokenRequest {
  refresh_token: string
}

export interface AuthError {
  detail: string
  error_code?: string
}

export interface AuthState {
  user: User | null
  tokens: {
    access_token: string | null
    refresh_token: string | null
    expires_at: number | null
  }
  isAuthenticated: boolean
  isLoading: boolean
}