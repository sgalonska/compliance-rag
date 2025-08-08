import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { AuthService } from '@/lib/auth'
import { LoginRequest, RegisterRequest, User } from '@/types/auth'
import { QueryKeys } from '@/types/api'
import { useToast } from './use-toast'

export function useAuth() {
  const authStore = useAuthStore()
  
  return {
    user: authStore.user,
    isAuthenticated: authStore.isAuthenticated,
    isLoading: authStore.isLoading,
    tokens: authStore.tokens,
  }
}

export function useLogin() {
  const login = useAuthStore((state) => state.login)
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      await login(credentials)
    },
    onSuccess: () => {
      toast({
        title: 'Login successful',
        description: 'Welcome back!',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Login failed',
        description: error.detail || 'Please check your credentials and try again.',
        variant: 'destructive',
      })
    },
  })
}

export function useRegister() {
  const register = useAuthStore((state) => state.register)
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async (userData: RegisterRequest) => {
      await register(userData)
    },
    onSuccess: () => {
      toast({
        title: 'Registration successful',
        description: 'Your account has been created successfully!',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Registration failed',
        description: error.detail || 'Please check your information and try again.',
        variant: 'destructive',
      })
    },
  })
}

export function useLogout() {
  const logout = useAuthStore((state) => state.logout)
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async () => {
      await logout()
    },
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear()
      toast({
        title: 'Logged out',
        description: 'You have been logged out successfully.',
      })
    },
    onError: (error: any) => {
      console.error('Logout error:', error)
      // Still clear cache even if logout request fails
      queryClient.clear()
      toast({
        title: 'Logged out',
        description: 'You have been logged out.',
      })
    },
  })
}

export function useCurrentUser() {
  const { isAuthenticated } = useAuth()
  
  return useQuery({
    queryKey: QueryKeys.USER,
    queryFn: AuthService.getCurrentUser,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry if unauthorized
      if (error.status === 401) return false
      return failureCount < 3
    },
  })
}

export function useUpdateProfile() {
  const updateUser = useAuthStore((state) => state.updateUser)
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: (userData: Partial<User>) => AuthService.updateProfile(userData),
    onSuccess: (updatedUser) => {
      // Update auth store
      updateUser(updatedUser)
      
      // Update query cache
      queryClient.setQueryData(QueryKeys.USER, updatedUser)
      
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error.detail || 'Failed to update profile.',
        variant: 'destructive',
      })
    },
  })
}

export function useChangePassword() {
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: ({ oldPassword, newPassword }: { oldPassword: string; newPassword: string }) =>
      AuthService.changePassword(oldPassword, newPassword),
    onSuccess: () => {
      toast({
        title: 'Password changed',
        description: 'Your password has been changed successfully.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Password change failed',
        description: error.detail || 'Failed to change password.',
        variant: 'destructive',
      })
    },
  })
}

export function useResetPassword() {
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: (email: string) => AuthService.resetPassword(email),
    onSuccess: () => {
      toast({
        title: 'Reset link sent',
        description: 'Check your email for password reset instructions.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Reset failed',
        description: error.detail || 'Failed to send reset email.',
        variant: 'destructive',
      })
    },
  })
}

export function useConfirmPasswordReset() {
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) =>
      AuthService.confirmPasswordReset(token, newPassword),
    onSuccess: () => {
      toast({
        title: 'Password reset successful',
        description: 'Your password has been reset. You can now log in with your new password.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Password reset failed',
        description: error.detail || 'Failed to reset password.',
        variant: 'destructive',
      })
    },
  })
}

// Hook to check authentication status and handle token refresh
export function useAuthChecker() {
  const checkAuth = useAuthStore((state) => state.checkAuth)
  const { isAuthenticated } = useAuth()
  
  return useQuery({
    queryKey: ['auth-check'],
    queryFn: checkAuth,
    enabled: !isAuthenticated,
    refetchInterval: 5 * 60 * 1000, // Check every 5 minutes
    refetchOnWindowFocus: true,
    retry: false,
  })
}