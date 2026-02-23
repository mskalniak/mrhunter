import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Check, Sparkles, Save } from "lucide-react"
import type { HabitColor } from "../types"
import { ICONS, COLORS } from "../constants"
import { useHabits } from "../hooks/use-habits"
import { useUpdateHabit } from "../hooks/use-update-habit"

const ICON_KEYS = Object.keys(ICONS)
const COLOR_KEYS = Object.keys(COLORS) as HabitColor[]

export function EditHabit() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { data, isLoading } = useHabits()
  const updateHabit = useUpdateHabit()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [icon, setIcon] = useState("sparkles")
  const [color, setColor] = useState<HabitColor>("purple")

  const habit = (data?.habits ?? []).find((h) => h.id === id)
  const colors = COLORS[color]
  const PreviewIcon = ICONS[icon] || Sparkles

  const initializedRef = useRef(false)
  useEffect(() => {
    if (!habit || initializedRef.current) return
    initializedRef.current = true
    setName(habit.name)
    setDescription(habit.description || "")
    setIcon(habit.icon)
    setColor(habit.color)
  }, [habit])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !name.trim()) return

    updateHabit.mutate(
      {
        habitId: id,
        data: {
          name: name.trim(),
          description: description.trim(),
          icon,
          color,
        },
      },
      { onSuccess: () => navigate("/") }
    )
  }

  if (isLoading) {
    return <div className="dash"><p style={{ textAlign: "center", padding: "2rem", opacity: 0.6 }}>Loading habit...</p></div>
  }

  if (!habit) {
    return <div className="dash"><p style={{ textAlign: "center", padding: "2rem", color: "#ef4444" }}>Habit not found</p></div>
  }

  return (
    <div className="add-habit">
      <div className="add-habit-preview-panel">
        <p className="add-habit-preview-label">LIVE PREVIEW</p>

        <div className="add-habit-preview-card">
          <div className="dash-habit-header">
            <div className="dash-habit-icon" style={{ background: colors.bg }}>
              <PreviewIcon size={24} style={{ color: colors.main }} />
            </div>
            <div className="dash-habit-streak">
              <span className="dash-habit-streak-label">STREAK</span>
              <span
                className="dash-habit-streak-num"
                style={{ color: colors.main }}
              >
                {habit.streak}
              </span>
            </div>
          </div>

          <h3 className="dash-habit-name">
            {name || "Habit Name"}
          </h3>
          {(description || !name) && (
            <p className="dash-habit-desc">
              {description || "Your description here"}
            </p>
          )}

          <div className="dash-habit-week">
            {habit.weekHistory.slice(0, 6).map((done, i) => (
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
              className={`dash-check ${habit.completedToday ? "dash-check-done" : ""}`}
              type="button"
              tabIndex={-1}
            >
              {habit.completedToday && <Check size={20} strokeWidth={3} />}
            </button>
          </div>
        </div>
      </div>

      <form className="add-habit-form" onSubmit={handleSubmit}>
        <h2 className="add-habit-form-title">Edit Habit</h2>
        <p className="add-habit-form-subtitle">
          Update your habit settings
        </p>

        <div className="add-habit-field">
          <label className="add-habit-label">HABIT NAME</label>
          <input
            className="add-habit-input"
            type="text"
            placeholder="e.g. Morning Meditation"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoFocus
          />
        </div>

        <div className="add-habit-field">
          <label className="add-habit-label">DESCRIPTION (OPTIONAL)</label>
          <textarea
            className="add-habit-textarea"
            placeholder="e.g. 15 mins mindfulness"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={80}
          />
        </div>

        <div className="add-habit-field">
          <label className="add-habit-label">ICON</label>
          <div className="add-habit-icons">
            {ICON_KEYS.map((key) => {
              const Icon = ICONS[key]
              const isSelected = key === icon
              return (
                <button
                  key={key}
                  type="button"
                  className={`add-habit-icon-btn ${isSelected ? "add-habit-icon-btn-active" : ""}`}
                  style={
                    isSelected
                      ? {
                          borderColor: colors.main,
                          boxShadow: `0 0 0 2px ${colors.main}40`,
                        }
                      : undefined
                  }
                  onClick={() => setIcon(key)}
                >
                  <Icon
                    size={20}
                    style={isSelected ? { color: colors.main } : undefined}
                  />
                </button>
              )
            })}
          </div>
        </div>

        <div className="add-habit-field">
          <label className="add-habit-label">THEME COLOR</label>
          <div className="add-habit-colors">
            {COLOR_KEYS.map((key) => {
              const isSelected = key === color
              return (
                <button
                  key={key}
                  type="button"
                  className={`add-habit-color-btn ${isSelected ? "add-habit-color-btn-active" : ""}`}
                  style={{
                    background: COLORS[key].main,
                    boxShadow: isSelected
                      ? `0 0 0 3px #fff, 0 0 0 5px ${COLORS[key].main}`
                      : undefined,
                  }}
                  onClick={() => setColor(key)}
                >
                  {isSelected && <Check size={14} strokeWidth={3} />}
                </button>
              )
            })}
          </div>
        </div>

        <div className="add-habit-submit-row">
          <button
            type="button"
            className="add-habit-secondary"
            onClick={() => navigate("/")}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="add-habit-submit"
            disabled={!name.trim() || updateHabit.isPending}
          >
            {updateHabit.isPending ? "Saving..." : "Save Changes"}
            <Save size={16} />
          </button>
        </div>
      </form>
    </div>
  )
}
