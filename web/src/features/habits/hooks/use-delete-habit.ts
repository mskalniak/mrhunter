import { useDeleteHabit as useDeleteHabitShared } from "@solomakers/shared"
import { toast } from "sonner"

export function useDeleteHabit() {
  const mutation = useDeleteHabitShared()
  return {
    ...mutation,
    mutate: ((variables: any, options?: any) => {
      mutation.mutate(variables, {
        ...options,
        onError: (error: any) => {
          toast.error("Failed to delete habit")
          options?.onError?.(error)
        },
      })
    }) as typeof mutation.mutate,
  }
}
