import { useMutation, useQueryClient } from "@tanstack/react-query"
import { habitApi } from "../../api"
import type { Habit } from "../../types"
import { withRecomputedStats } from "./habits-cache"
import type { HabitsResponse } from "./habits-cache"

export function useReorderHabits() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (orderedIds: string[]) =>
      habitApi("/reorder", { method: "PATCH", body: JSON.stringify({ orderedIds }) }),
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: ["habits"] })
      const previous = queryClient.getQueryData<HabitsResponse>(["habits"])
      if (!previous) return { previous }

      const habitById = new Map(previous.habits.map((h) => [h.id, h] as const))
      const reordered = orderedIds
        .map((id) => habitById.get(id))
        .filter(Boolean) as Habit[]

      const known = new Set(reordered.map((h) => h.id))
      const missing = previous.habits.filter((h) => !known.has(h.id))
      const nextHabits = [...reordered, ...missing].map((h, index) => ({
        ...h,
        position: index,
      }))

      queryClient.setQueryData<HabitsResponse>(
        ["habits"],
        withRecomputedStats(previous, nextHabits)
      )

      return { previous }
    },
    onError: (_error, _orderedIds, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["habits"], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] })
    },
  })
}
