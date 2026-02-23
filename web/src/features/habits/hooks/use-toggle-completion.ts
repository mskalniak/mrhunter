import { useToggleCompletion as useToggleCompletionShared } from "@solomakers/shared"
import { toast } from "sonner"

export function useToggleCompletion() {
  const mutation = useToggleCompletionShared()
  return {
    ...mutation,
    mutate: ((variables: any, options?: any) => {
      mutation.mutate(variables, {
        ...options,
        onError: (error: any) => {
          toast.error("Failed to update habit")
          options?.onError?.(error)
        },
      })
    }) as typeof mutation.mutate,
  }
}
