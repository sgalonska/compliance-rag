import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AuthState, User, LoginRequest, RegisterRequest } from '@/types/auth'
import { AuthService } from '@/lib/auth'

interface AuthStore extends AuthState {
  // Actions
  login: (credentials: LoginRequest) => Promise<void>
  register: (userData: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  updateUser: (user: User) => void
  setLoading: (isLoading: boolean) => void
  initializeAuth: () => void
  checkAuth: () => Promise<boolean>
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      tokens: {
        access_token: null,
        refresh_token: null,
        expires_at: null,
      },
      isAuthenticated: false,
      isLoading: false,

      // Actions
      login: async (credentials: LoginRequest) => {
        set({ isLoading: true })
        
        try {
          const response = await AuthService.login(credentials)
          
          set({
            user: response.user,
            tokens: {
              access_token: response.access_token,
              refresh_token: response.refresh_token,
              expires_at: Date.now() + (response.expires_in * 1000),
            },
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      register: async (userData: RegisterRequest) => {
        set({ isLoading: true })
        
        try {
          const response = await AuthService.register(userData)
          
          set({
            user: response.user,
            tokens: {
              access_token: response.access_token,
              refresh_token: response.refresh_token,
              expires_at: Date.now() + (response.expires_in * 1000),
            },
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: async () => {
        set({ isLoading: true })
        
        try {
          await AuthService.logout()
        } catch (error) {
          console.warn('Logout request failed:', error)
        } finally {
          set({
            user: null,
            tokens: {
              access_token: null,
              refresh_token: null,
              expires_at: null,
            },
            isAuthenticated: false,
            isLoading: false,
          })
        }
      },

      refreshToken: async () => {
        try {
          const response = await AuthService.refreshToken()
          
          if (response) {
            set({
              user: response.user,
              tokens: {
                access_token: response.access_token,
                refresh_token: response.refresh_token,
                expires_at: Date.now() + (response.expires_in * 1000),
              },
              isAuthenticated: true,
            })
          } else {
            // Refresh failed, clear auth state
            set({
              user: null,
              tokens: {
                access_token: null,
                refresh_token: null,
                expires_at: null,
              },
              isAuthenticated: false,
            })
          }
        } catch (error) {
          // Refresh failed, clear auth state
          set({
            user: null,
            tokens: {
              access_token: null,
              refresh_token: null,
              expires_at: null,
            },
            isAuthenticated: false,
          })
          throw error
        }
      },

      updateUser: (user: User) => {
        set({ user })
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading })
      },

      initializeAuth: () => {
        if (typeof window === 'undefined') return

        const storedUser = AuthService.getStoredUser()
        const accessToken = AuthService.getAccessToken()
        const refreshToken = AuthService.getRefreshToken()
        const expiresAt = AuthService.getTokenExpiresAt()

        if (storedUser && accessToken && refreshToken && expiresAt) {
          const isAuthenticated = AuthService.isAuthenticated()
          
          set({
            user: storedUser,
            tokens: {
              access_token: accessToken,
              refresh_token: refreshToken,
              expires_at: expiresAt,
            },
            isAuthenticated,
          })

          // If token is expired or close to expiring, try to refresh
          if (!isAuthenticated && refreshToken) {
            get().refreshToken().catch(() => {
              // Refresh failed, user will need to login again
            })
          }
        }
      },

      checkAuth: async () => {
        const { isAuthenticated, tokens } = get()
        
        if (!isAuthenticated || !tokens.access_token) {
          return false
        }

        // Check if token is expired
        if (tokens.expires_at && Date.now() >= tokens.expires_at) {
          try {
            await get().refreshToken()
            return get().isAuthenticated
          } catch {
            return false
          }
        }

        return true
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.initializeAuth()
        }
      },
    }
  )
)

// Initialize auth on store creation
if (typeof window !== 'undefined') {
  useAuthStore.getState().initializeAuth()
}