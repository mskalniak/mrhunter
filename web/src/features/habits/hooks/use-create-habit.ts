import { useCreateHabit as useCreateHabitShared } from "@solomakers/shared"
import { toast } from "sonner"

export function useCreateHabit() {
  const mutation = useCreateHabitShared()
  return {
    ...mutation,
    mutate: ((variables: any, options?: any) => {
      mutation.mutate(variables, {
        ...options,
        onError: (error: any) => {
          toast.error("Failed to create habit")
          options?.onError?.(error)
        },
      })
    }) as typeof mutation.mutate,
  }
}
