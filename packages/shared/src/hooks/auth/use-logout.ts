import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "./use-auth"

export function useLogout() {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.clear()
    },
  })
}
