import { useReorderHabits as useReorderHabitsShared } from "@solomakers/shared"
import { toast } from "sonner"

export function useReorderHabits() {
  const mutation = useReorderHabitsShared()
  return {
    ...mutation,
    mutate: ((variables: any, options?: any) => {
      mutation.mutate(variables, {
        ...options,
        onError: (error: any) => {
          toast.error("Failed to reorder habits")
          options?.onError?.(error)
        },
      })
    }) as typeof mutation.mutate,
  }
}
