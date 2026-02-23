import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Check, Sparkles, Rocket } from "lucide-react"
import type { HabitColor } from "../types"
import { ICONS, COLORS } from "../constants"
import { useCreateHabit } from "../hooks/use-create-habit"

const ICON_KEYS = Object.keys(ICONS)
const COLOR_KEYS = Object.keys(COLORS) as HabitColor[]

export function AddHabit() {
  const navigate = useNavigate()
  const createHabit = useCreateHabit()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [icon, setIcon] = useState("sparkles")
  const [color, setColor] = useState<HabitColor>("purple")

  const colors = COLORS[color]
  const PreviewIcon = ICONS[icon] || Sparkles

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    createHabit.mutate(
      {
        name: name.trim(),
        description: description.trim(),
        icon,
        color,
      },
      { onSuccess: () => navigate("/") }
    )
  }

  return (
    <div className="add-habit">
      {/* Left: Live Preview */}
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
                0
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
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="dash-habit-bar dash-habit-bar-miss" />
            ))}
          </div>

          <div className="dash-habit-action">
            <button className="dash-check" type="button" tabIndex={-1}>
              <span />
            </button>
          </div>
        </div>
      </div>

      {/* Right: Form */}
      <form className="add-habit-form" onSubmit={handleSubmit}>
        <h2 className="add-habit-form-title">Create New Habit</h2>
        <p className="add-habit-form-subtitle">
          Design a habit that fits your lifestyle
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
            type="submit"
            className="add-habit-submit"
            disabled={!name.trim() || createHabit.isPending}
          >
            {createHabit.isPending ? "Creating..." : "Create Habit"}
            <Rocket size={16} />
          </button>
        </div>
      </form>
    </div>
  )
}
