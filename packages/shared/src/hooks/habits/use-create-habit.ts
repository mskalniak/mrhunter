import { useMutation, useQueryClient } from "@tanstack/react-query"
import { habitApi } from "../../api"
import type { Habit, CreateHabitInput } from "../../types"
import { withRecomputedStats } from "./habits-cache"
import type { HabitsResponse } from "./habits-cache"

export function useCreateHabit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateHabitInput) =>
      habitApi<Habit>("/", { method: "POST", body: JSON.stringify(data) }),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["habits"] })
      const previous = queryClient.getQueryData<HabitsResponse>(["habits"])
      if (!previous) return { previous }

      const maxPosition = previous.habits.reduce(
        (max, h) => Math.max(max, h.position),
        -1
      )

      const optimisticHabit: Habit = {
        id: `optimistic-${Date.now()}`,
        name: data.name.trim(),
        description: data.description.trim(),
        icon: data.icon,
        color: data.color,
        position: maxPosition + 1,
        streak: 0,
        weekHistory: Array(7).fill(false),
        completedToday: false,
      }

      const nextHabits = [...previous.habits, optimisticHabit]
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
