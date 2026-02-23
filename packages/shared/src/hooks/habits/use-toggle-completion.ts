import { useMutation, useQueryClient } from "@tanstack/react-query"
import { habitApi } from "../../api"
import { withRecomputedStats } from "./habits-cache"
import type { HabitsResponse } from "./habits-cache"

export function useToggleCompletion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ habitId, completed, date }: { habitId: string; completed: boolean; date?: string }) => {
      if (completed) {
        const query = date ? `?date=${date}` : ""
        return habitApi(`/${habitId}/complete${query}`, { method: "DELETE" })
      } else {
        return habitApi(`/${habitId}/complete`, {
          method: "POST",
          body: JSON.stringify(date ? { date } : {}),
        })
      }
    },
    onMutate: async ({ habitId, date }) => {
      await queryClient.cancelQueries({ queryKey: ["habits"] })
      const previous = queryClient.getQueryData<HabitsResponse>(["habits"])
      if (!previous) return { previous }

      const isYesterday = !!date

      const nextHabits = previous.habits.map((habit) => {
        if (habit.id !== habitId) return habit
        if (isYesterday) {
          const nextWeek = [...habit.weekHistory]
          nextWeek[6] = !nextWeek[6]
          return { ...habit, weekHistory: nextWeek }
        }
        const nextCompleted = !habit.completedToday
        return {
          ...habit,
          completedToday: nextCompleted,
          streak: nextCompleted ? habit.streak + 1 : Math.max(0, habit.streak - 1),
        }
      })

      queryClient.setQueryData<HabitsResponse>(
        ["habits"],
        withRecomputedStats(previous, nextHabits)
      )
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["habits"], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] })
    },
  })
}
