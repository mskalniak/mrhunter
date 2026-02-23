import { useMutation } from "@tanstack/react-query"
import { useAuth } from "./use-auth"

export function useLogin() {
  const { supabase } = useAuth()

  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      })
      if (error) throw error
    },
  })
}
