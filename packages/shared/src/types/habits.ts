export type HabitColor =
  | "purple" | "blue" | "emerald" | "amber" | "pink" | "red"
  | "orange" | "yellow" | "green" | "teal" | "lightBlue"
  | "lightPurple" | "lavender" | "darkPurple"

export type Habit = {
  id: string
  name: string
  description: string
  icon: string
  color: HabitColor
  position: number
  streak: number
  /** Last 7 days completion history (index 0 = oldest, 6 = yesterday) */
  weekHistory: boolean[]
  completedToday: boolean
}

export type HabitsResponse = {
  habits: Habit[]
  stats: {
    todayPulse: number
    yesterdayPct: number
    weeklyAvg: number
    weeklyFlow: string
    diff: number
  }
}

export type CreateHabitInput = {
  name: string
  description: string
  icon: string
  color: HabitColor
}

export type UpdateHabitInput = {
  habitId: string
  data: {
    name: string
    description: string
    icon: string
    color: HabitColor
  }
}
