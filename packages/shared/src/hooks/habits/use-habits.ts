import { useQuery } from "@tanstack/react-query"
import { habitApi } from "../../api"
import type { HabitsResponse } from "./habits-cache"

export function useHabits() {
  return useQuery({
    queryKey: ["habits"],
    queryFn: () => habitApi<HabitsResponse>(""),
  })
}
