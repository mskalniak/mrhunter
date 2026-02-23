import { useMutation, useQueryClient } from "@tanstack/react-query"
import { habitApi } from "../../api"
import type { Habit, UpdateHabitInput } from "../../types"
import { withRecomputedStats } from "./habits-cache"
import type { HabitsResponse } from "./habits-cache"

export function useUpdateHabit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ habitId, data }: UpdateHabitInput) =>
      habitApi<Habit>(`/${habitId}`, { method: "PATCH", body: JSON.stringify(data) }),
    onMutate: async ({ habitId, data }) => {
      await queryClient.cancelQueries({ queryKey: ["habits"] })
      const previous = queryClient.getQueryData<HabitsResponse>(["habits"])
      if (!previous) return { previous }

      const nextHabits = previous.habits.map((habit) =>
        habit.id === habitId
          ? {
              ...habit,
              name: data.name.trim(),
              description: data.description.trim(),
              icon: data.icon,
              color: data.color,
            }
          : habit
      )

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
