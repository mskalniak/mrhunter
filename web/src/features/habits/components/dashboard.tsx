import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  RotateCcw,
  Check,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  TriangleAlert,
} from "lucide-react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import * as Dialog from "@radix-ui/react-dialog"
import type { Habit } from "../types"
import { ICONS, COLORS } from "../constants"
import { Sparkles } from "lucide-react"
import { useHabits } from "../hooks/use-habits"
import { useToggleCompletion } from "../hooks/use-toggle-completion"
import { useDeleteHabit } from "../hooks/use-delete-habit"
import { useReorderHabits } from "../hooks/use-reorder-habits"

export function Dashboard() {
  const { data, isLoading, error } = useHabits()
  const toggleCompletion = useToggleCompletion()
  const deleteHabitMutation = useDeleteHabit()
  const reorderMutation = useReorderHabits()
  const navigate = useNavigate()

  // Drag state
  const dragIdx = useRef<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const [viewingYesterday, setViewingYesterday] = useState(false)
  const yesterdayDate = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const habits = data?.habits ?? []
  const stats = data?.stats ?? { todayPulse: 0, yesterdayPct: 0, weeklyAvg: 0, weeklyFlow: "Needs Focus", diff: 0 }

  function toggleHabit(id: string) {
    const habit = habits.find((h) => h.id === id)
    if (!habit) return
    if (viewingYesterday) {
      toggleCompletion.mutate({ habitId: id, completed: habit.weekHistory[6], date: yesterdayDate })
    } else {
      toggleCompletion.mutate({ habitId: id, completed: habit.completedToday })
    }
  }

  function confirmDelete() {
    if (deleteTarget) {
      deleteHabitMutation.mutate(deleteTarget)
      setDeleteTarget(null)
    }
  }

  function handleDragStart(index: number) {
    dragIdx.current = index
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    setDragOverIdx(index)
  }

  function handleDrop(index: number) {
    const from = dragIdx.current
    if (from === null || from === index) {
      dragIdx.current = null
      setDragOverIdx(null)
      return
    }
    const next = [...habits]
    const [moved] = next.splice(from, 1)
    next.splice(index, 0, moved)
    reorderMutation.mutate(next.map((h) => h.id))
    dragIdx.current = null
    setDragOverIdx(null)
  }

  function handleDragEnd() {
    dragIdx.current = null
    setDragOverIdx(null)
  }

  const dailyRates = habits.length
    ? Array.from({ length: 7 }, (_, day) => {
        const done = habits.filter((h) => h.weekHistory[day]).length
        return (done / habits.length) * 100
      })
    : Array(7).fill(0)

  if (isLoading) return <div className="dash"><p style={{ textAlign: "center", padding: "2rem", opacity: 0.6 }}>Loading habits...</p></div>
  if (error) return <div className="dash"><p style={{ textAlign: "center", padding: "2rem", color: "#ef4444" }}>Failed to load habits</p></div>

  return (
    <div className="dash">
      {/* Stats row */}
      <section className="dash-stats">
        <div
          className={`dash-stat-card dash-stat-clickable ${!viewingYesterday ? "dash-stat-active" : ""}`}
          onClick={() => setViewingYesterday(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setViewingYesterday(false)}
        >
          <CircleProgress percent={stats.todayPulse} />
          <div>
            <p className="dash-stat-label">TODAY'S PULSE</p>
            <p className="dash-stat-value">
              {habits.filter((h) => h.completedToday).length} of {habits.length} Done
            </p>
          </div>
        </div>

        <div
          className={`dash-stat-card dash-stat-clickable ${viewingYesterday ? "dash-stat-active" : ""}`}
          onClick={() => setViewingYesterday(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setViewingYesterday(true)}
        >
          <div
            className="dash-stat-icon"
            style={{ background: "rgba(59, 130, 246, 0.1)" }}
          >
            <RotateCcw size={22} style={{ color: "#3b82f6" }} />
          </div>
          <div>
            <p className="dash-stat-label">YESTERDAY</p>
            <div className="dash-stat-row">
              <span className="dash-stat-value">{stats.yesterdayPct}%</span>
              {stats.diff !== 0 && (
                <span
                  className={
                    stats.diff > 0 ? "dash-stat-up" : "dash-stat-down"
                  }
                >
                  {stats.diff > 0 ? "+" : ""}
                  {stats.diff}% vs avg
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="dash-stat-card">
          <WeeklyChart dailyRates={dailyRates} />
          <div>
            <p className="dash-stat-label">WEEKLY FLOW</p>
            <p className="dash-stat-value">{stats.weeklyFlow}</p>
          </div>
        </div>
      </section>

      <div className="dash-separator" />

      <section className="dash-habits">
        <h2 className="dash-section-title">
          {viewingYesterday ? (
            <>
              <span className="dash-dot dash-dot-blue" />
              Yesterday
              <button
                className="dash-back-btn"
                onClick={() => setViewingYesterday(false)}
              >
                <ArrowLeft size={14} />
                Back to Today
              </button>
            </>
          ) : (
            <>
              <span className="dash-dot" />
              Today
            </>
          )}
        </h2>

        <div key={viewingYesterday ? "yesterday" : "today"} className={`dash-slide-container ${viewingYesterday ? "dash-slide-yesterday" : "dash-slide-today"}`}>
          <div className="dash-grid">
            {habits.map((habit, index) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                index={index}
                isDragOver={dragOverIdx === index}
                isYesterday={viewingYesterday}
                onToggle={toggleHabit}
                onEdit={(habitId) => navigate(`/edit-habit/${habitId}`)}
                onDelete={setDeleteTarget}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
              />
            ))}
            {!viewingYesterday && <AddHabitCard onClick={() => navigate("/add-habit")} />}
          </div>
        </div>
      </section>

      {/* Delete confirmation dialog */}
      <Dialog.Root
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dash-dialog-overlay" />
          <Dialog.Content className="dash-dialog">
            <div className="dash-dialog-icon">
              <TriangleAlert size={28} />
            </div>
            <Dialog.Title className="dash-dialog-title">
              Delete Habit
            </Dialog.Title>
            <Dialog.Description className="dash-dialog-desc">
              This action cannot be undone. The habit and all its streak data
              will be permanently removed.
            </Dialog.Description>
            <div className="dash-dialog-actions">
              <button
                className="dash-dialog-cancel"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button className="dash-dialog-confirm" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

/* ---- Sub-components ---- */

function CircleProgress({ percent }: { percent: number }) {
  const r = 40
  const c = 2 * Math.PI * r
  const offset = c * (1 - percent / 100)

  return (
    <div className="dash-circle">
      <svg viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="10"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#a855f7"
          strokeWidth="10"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
        />
      </svg>
      <span className="dash-circle-text">{percent}%</span>
    </div>
  )
}

function WeeklyChart({ dailyRates }: { dailyRates: number[] }) {
  const pts = dailyRates.map((rate, i) => {
    const x = (i / 6) * 100
    const y = 40 - (rate / 100) * 35
    return `${x},${y}`
  })
  const line = `M${pts.join(" L")}`
  const area = `M0,40 L${pts.join(" L")} L100,40 Z`

  return (
    <svg viewBox="0 0 100 40" className="dash-chart">
      <path d={area} fill="rgba(168, 85, 247, 0.15)" />
      <path
        d={line}
        fill="none"
        stroke="#a855f7"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function HabitCard({
  habit,
  index,
  isDragOver,
  isYesterday,
  onToggle,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  habit: Habit
  index: number
  isDragOver: boolean
  isYesterday: boolean
  onToggle: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onDragStart: (index: number) => void
  onDragOver: (e: React.DragEvent, index: number) => void
  onDrop: (index: number) => void
  onDragEnd: () => void
}) {
  const Icon = ICONS[habit.icon] || Sparkles
  const colors = COLORS[habit.color] || COLORS.purple

  return (
    <div
      className={`dash-habit ${
        (isYesterday ? habit.weekHistory[6] : habit.completedToday) ? "dash-habit-done" : ""
      } ${isDragOver ? "dash-habit-drag-over" : ""}`}
      draggable={!isYesterday}
      onDragStart={isYesterday ? undefined : () => onDragStart(index)}
      onDragOver={isYesterday ? undefined : (e) => onDragOver(e, index)}
      onDrop={isYesterday ? undefined : () => onDrop(index)}
      onDragEnd={isYesterday ? undefined : onDragEnd}
    >
      {/* Streak — top right */}
      <div className="dash-habit-streak">
        <span className="dash-habit-streak-label">STREAK</span>
        <span
          className="dash-habit-streak-num"
          style={{ color: colors.main }}
        >
          {habit.streak}
        </span>
      </div>

      {/* Icon + content */}
      <div className="dash-habit-header">
        <div className="dash-habit-icon" style={{ background: colors.bg }}>
          <Icon size={24} style={{ color: colors.main }} />
        </div>
      </div>

      <div className="dash-habit-info">
        <h3 className="dash-habit-name">{habit.name}</h3>
        {habit.description && (
          <p className="dash-habit-desc">{habit.description}</p>
        )}
      </div>

      <div className="dash-habit-week">
        {habit.weekHistory.slice(1).map((done, i) => (
          <div
            key={i}
            className={`dash-habit-bar ${done ? "" : "dash-habit-bar-miss"}`}
            style={done ? { background: colors.main } : undefined}
          />
        ))}
        <div
          className={`dash-habit-bar ${habit.completedToday ? "" : "dash-habit-bar-miss"}`}
          style={habit.completedToday ? { background: colors.main } : undefined}
        />
      </div>

      <div className="dash-habit-action">
        <button
          className={`dash-check ${
            (isYesterday ? habit.weekHistory[6] : habit.completedToday) ? "dash-check-done" : ""
          }`}
          onClick={() => onToggle(habit.id)}
        >
          {(isYesterday ? habit.weekHistory[6] : habit.completedToday) && (
            <Check size={20} strokeWidth={3} />
          )}
        </button>
      </div>

      {/* Three dots menu — bottom left */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="dash-habit-menu-btn" title="Options">
            <MoreVertical size={16} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="dash-habit-dropdown"
            sideOffset={4}
            align="start"
          >
            <DropdownMenu.Item
              className="dash-habit-dropdown-item"
              onSelect={() => onEdit(habit.id)}
            >
              <Pencil size={14} />
              Edit
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="dash-habit-dropdown-item dash-habit-dropdown-delete"
              onSelect={() => onDelete(habit.id)}
            >
              <Trash2 size={14} />
              Delete
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  )
}

function AddHabitCard({ onClick }: { onClick: () => void }) {
  return (
    <div className="dash-add-card" onClick={onClick}>
      <div className="dash-add-icon">
        <Plus size={24} />
      </div>
      <p className="dash-add-title">Design Habit</p>
      <p className="dash-add-sub">CREATE CUSTOM</p>
    </div>
  )
}
