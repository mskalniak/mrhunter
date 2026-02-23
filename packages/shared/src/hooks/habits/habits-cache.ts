import type { Habit, HabitsResponse } from "../../types"

export type { HabitsResponse }

export function withRecomputedStats(
  previous: HabitsResponse,
  nextHabits: Habit[]
): HabitsResponse {
  const total = nextHabits.length
  const doneToday = nextHabits.filter((h) => h.completedToday).length
  const doneYesterday = nextHabits.filter((h) => h.weekHistory[6]).length
  const weeklyDone = nextHabits.reduce(
    (sum, h) => sum + h.weekHistory.filter(Boolean).length,
    0
  )
  const weeklyAvg = total ? Math.round((weeklyDone / (total * 7)) * 100) : 0
  const yesterdayPct = total ? Math.round((doneYesterday / total) * 100) : 0

  return {
    habits: nextHabits,
    stats: {
      ...previous.stats,
      todayPulse: total ? Math.round((doneToday / total) * 100) : 0,
      yesterdayPct,
      weeklyAvg,
      diff: yesterdayPct - weeklyAvg,
    },
  }
}
