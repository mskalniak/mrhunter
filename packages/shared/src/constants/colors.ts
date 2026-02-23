import type { HabitColor } from "../types"

export const COLORS: Record<HabitColor, { main: string; bg: string }> = {
  purple: { main: "#a855f7", bg: "rgba(168, 85, 247, 0.12)" },
  blue: { main: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)" },
  emerald: { main: "#10b981", bg: "rgba(16, 185, 129, 0.12)" },
  amber: { main: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)" },
  pink: { main: "#ec4899", bg: "rgba(236, 72, 153, 0.12)" },
  red: { main: "#ef4444", bg: "rgba(239, 68, 68, 0.12)" },
  orange: { main: "#f97316", bg: "rgba(249, 115, 22, 0.12)" },
  yellow: { main: "#eab308", bg: "rgba(234, 179, 8, 0.12)" },
  green: { main: "#22c55e", bg: "rgba(34, 197, 94, 0.12)" },
  teal: { main: "#14b8a6", bg: "rgba(20, 184, 166, 0.12)" },
  lightBlue: { main: "#38bdf8", bg: "rgba(56, 189, 248, 0.12)" },
  lightPurple: { main: "#c084fc", bg: "rgba(192, 132, 252, 0.12)" },
  lavender: { main: "#818cf8", bg: "rgba(129, 140, 248, 0.12)" },
  darkPurple: { main: "#7c3aed", bg: "rgba(124, 58, 237, 0.12)" },
}

export const ICON_NAMES = [
  "sparkles", "droplets", "code", "book", "person", "flame",
  "target", "monitor", "dumbbell", "music", "pencil", "leaf",
  "bird", "crosshair", "sun", "heart",
] as const
