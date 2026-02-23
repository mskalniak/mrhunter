// Types
export type {
  HabitColor, Habit, CreateHabitInput, UpdateHabitInput, AuthState,
} from "./types"

// Constants
export { COLORS, ICON_NAMES } from "./constants"

// API
export { configureApi, habitApi } from "./api"

// Lib
export { createQueryClient } from "./lib"

// Hooks
export {
  useHabits,
  useToggleCompletion,
  useCreateHabit,
  useUpdateHabit,
  useDeleteHabit,
  useReorderHabits,
  withRecomputedStats,
  AuthProvider,
  useAuth,
  useLogin,
  useVerifyOtp,
  useLogout,
} from "./hooks"
export type { HabitsResponse } from "./hooks"
