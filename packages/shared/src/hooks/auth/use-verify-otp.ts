import { useMutation } from "@tanstack/react-query"
import { useAuth } from "./use-auth"

type VerifyOtpInput = {
  email: string
  token: string
}

export function useVerifyOtp() {
  const { supabase } = useAuth()

  return useMutation({
    mutationFn: async ({ email, token }: VerifyOtpInput) => {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      })
      if (error) throw error
    },
  })
}
