import { useMutation, useQueryClient } from "@tanstack/react-query"
import { habitApi } from "../../api"
import { withRecomputedStats } from "./habits-cache"
import type { HabitsResponse } from "./habits-cache"

export function useDeleteHabit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (habitId: string) =>
      habitApi(`/${habitId}`, { method: "DELETE" }),
    onMutate: async (habitId) => {
      await queryClient.cancelQueries({ queryKey: ["habits"] })
      const previous = queryClient.getQueryData<HabitsResponse>(["habits"])
      if (!previous) return { previous }

      const nextHabits = previous.habits.filter((h) => h.id !== habitId)
      queryClient.setQueryData<HabitsResponse>(
        ["habits"],
        withRecomputedStats(previous, nextHabits)
      )

      return { previous }
    },
    onError: (_error, _habitId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["habits"], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] })
    },
  })
}
