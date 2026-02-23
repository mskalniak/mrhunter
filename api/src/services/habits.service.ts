import { supabaseAdmin } from "../lib/supabase.js"

// ── GET all habits + completions + stats for a user ─────────────

export async function getHabitsWithStats(userId: string) {
  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

  // Fetch active habits ordered by position
  const { data: habits, error: hErr } = await supabaseAdmin
    .from("habits")
    .select("id, name, description, icon, color, position")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("position", { ascending: true })

  if (hErr) throw hErr
  if (!habits || habits.length === 0) return { habits: [], stats: { todayPulse: 0, yesterdayPct: 0, weeklyAvg: 0, weeklyFlow: "Needs Focus", diff: 0 } }

  const habitIds = habits.map((h) => h.id)

  // Fetch completions for last 7 days + today
  const { data: completions, error: cErr } = await supabaseAdmin
    .from("habit_completions")
    .select("habit_id, completed_date")
    .eq("user_id", userId)
    .in("habit_id", habitIds)
    .gte("completed_date", weekAgo)
    .lte("completed_date", today)

  if (cErr) throw cErr

  // Fetch streaks
  const { data: streaks, error: sErr } = await supabaseAdmin
    .from("habit_streaks")
    .select("habit_id, current_streak")
    .in("habit_id", habitIds)

  if (sErr) throw sErr

  // Build a lookup: habitId → Set of completed date strings
  const completionMap = new Map<string, Set<string>>()
  for (const c of completions ?? []) {
    if (!completionMap.has(c.habit_id)) completionMap.set(c.habit_id, new Set())
    completionMap.get(c.habit_id)!.add(c.completed_date)
  }

  // Build streak lookup
  const streakMap = new Map<string, number>()
  for (const s of streaks ?? []) {
    streakMap.set(s.habit_id, s.current_streak)
  }

  // Build last 7 dates (index 0 = 7 days ago, index 6 = yesterday)
  const weekDates: string[] = []
  for (let i = 7; i >= 1; i--) {
    weekDates.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10))
  }
  const yesterday = weekDates[6]

  // Assemble habit response objects
  const habitsResponse = habits.map((h) => {
    const dates = completionMap.get(h.id) ?? new Set()
    return {
      id: h.id,
      name: h.name,
      description: h.description,
      icon: h.icon,
      color: h.color,
      position: h.position,
      completedToday: dates.has(today),
      streak: streakMap.get(h.id) ?? 0,
      weekHistory: weekDates.map((d) => dates.has(d)),
    }
  })

  // Calculate stats
  const total = habitsResponse.length
  const doneToday = habitsResponse.filter((h) => h.completedToday).length
  const todayPulse = total ? Math.round((doneToday / total) * 100) : 0

  const doneYesterday = habitsResponse.filter((h) => {
    const dates = completionMap.get(h.id) ?? new Set()
    return dates.has(yesterday)
  }).length
  const yesterdayPct = total ? Math.round((doneYesterday / total) * 100) : 0

  const weeklyTotal = total * 7
  const weeklyDone = habitsResponse.reduce((sum, h) => sum + h.weekHistory.filter(Boolean).length, 0)
  const weeklyAvg = weeklyTotal ? Math.round((weeklyDone / weeklyTotal) * 100) : 0

  const weeklyFlow = weeklyAvg >= 80 ? "Strong" : weeklyAvg >= 50 ? "Moderate" : "Needs Focus"
  const diff = yesterdayPct - weeklyAvg

  return {
    habits: habitsResponse,
    stats: { todayPulse, yesterdayPct, weeklyAvg, weeklyFlow, diff },
  }
}

// ── CREATE a new habit ──────────────────────────────────────────

export async function createHabit(userId: string, data: { name: string; description: string; icon: string; color: string }) {
  // Get max position for this user
  const { data: maxRow } = await supabaseAdmin
    .from("habits")
    .select("position")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("position", { ascending: false })
    .limit(1)
    .single()

  const nextPosition = (maxRow?.position ?? -1) + 1

  const { data: habit, error } = await supabaseAdmin
    .from("habits")
    .insert({
      user_id: userId,
      name: data.name,
      description: data.description,
      icon: data.icon,
      color: data.color,
      position: nextPosition,
    })
    .select()
    .single()

  if (error) throw error

  // Create streak row
  await supabaseAdmin.from("habit_streaks").insert({ habit_id: habit.id })

  return habit
}

// ── UPDATE a habit ──────────────────────────────────────────────

export async function updateHabit(userId: string, habitId: string, data: { name?: string; description?: string; icon?: string; color?: string }) {
  const { data: habit, error } = await supabaseAdmin
    .from("habits")
    .update(data)
    .eq("id", habitId)
    .eq("user_id", userId)
    .select()
    .single()

  if (error) throw error
  return habit
}

// ── SOFT-DELETE a habit ─────────────────────────────────────────

export async function deleteHabit(userId: string, habitId: string) {
  const { error } = await supabaseAdmin
    .from("habits")
    .update({ is_active: false })
    .eq("id", habitId)
    .eq("user_id", userId)

  if (error) throw error
}

// ── TOGGLE COMPLETION ───────────────────────────────────────────

export async function completeHabit(userId: string, habitId: string, date?: string) {
  const completedDate = date ?? new Date().toISOString().slice(0, 10)

  // Insert completion
  const { error } = await supabaseAdmin
    .from("habit_completions")
    .insert({ habit_id: habitId, user_id: userId, completed_date: completedDate })

  if (error) throw error

  // Update streak
  await recalculateStreak(habitId)
}

export async function uncompleteHabit(userId: string, habitId: string, date?: string) {
  const completedDate = date ?? new Date().toISOString().slice(0, 10)

  const { error } = await supabaseAdmin
    .from("habit_completions")
    .delete()
    .eq("habit_id", habitId)
    .eq("user_id", userId)
    .eq("completed_date", completedDate)

  if (error) throw error

  // Recalculate streak
  await recalculateStreak(habitId)
}

// ── REORDER HABITS ──────────────────────────────────────────────

export async function reorderHabits(userId: string, orderedIds: string[]) {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabaseAdmin
      .from("habits")
      .update({ position: i })
      .eq("id", orderedIds[i])
      .eq("user_id", userId)

    if (error) throw error
  }
}

// ── STREAK RECALCULATION ────────────────────────────────────────

async function recalculateStreak(habitId: string) {
  // Get all completions for this habit, ordered descending
  const { data: completions, error } = await supabaseAdmin
    .from("habit_completions")
    .select("completed_date")
    .eq("habit_id", habitId)
    .order("completed_date", { ascending: false })

  if (error) throw error
  if (!completions || completions.length === 0) {
    await supabaseAdmin
      .from("habit_streaks")
      .upsert({ habit_id: habitId, current_streak: 0, longest_streak: 0, last_completed_date: null })
    return
  }

  // Walk backwards from most recent completion
  const dates = completions.map((c) => c.completed_date)
  const lastDate = dates[0]
  let streak = 1

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1])
    const curr = new Date(dates[i])
    const diffDays = (prev.getTime() - curr.getTime()) / 86400000

    if (diffDays === 1) {
      streak++
    } else {
      break
    }
  }

  // Check if streak is still active (last completion is today or yesterday)
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (lastDate !== today && lastDate !== yesterday) {
    streak = 0
  }

  // Get current longest to compare
  const { data: existing } = await supabaseAdmin
    .from("habit_streaks")
    .select("longest_streak")
    .eq("habit_id", habitId)
    .single()

  const longestStreak = Math.max(existing?.longest_streak ?? 0, streak)

  await supabaseAdmin
    .from("habit_streaks")
    .upsert({
      habit_id: habitId,
      current_streak: streak,
      longest_streak: longestStreak,
      last_completed_date: lastDate,
    })
}
