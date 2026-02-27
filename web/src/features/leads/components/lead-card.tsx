import { useState } from "react"
import { ExternalLink, Bookmark, X, FileText } from "lucide-react"
import type { Lead, SignalType } from "../types"

const AVATAR_COLORS = [
  "bg-purple-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-rose-500",
]

function getAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return "?"
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function Avatar({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  const [imgError, setImgError] = useState(false)
  const initials = getInitials(name)
  const color = getAvatarColor(name)

  if (photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="h-10 w-10 shrink-0 rounded-full object-cover"
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${color} text-xs font-bold text-white`}>
      {initials}
    </div>
  )
}

const SIGNAL_LABELS: Record<SignalType, string> = {
  hiring: "Hiring",
  pain_point: "Pain Point",
  competitor_engagement: "Competitor",
  funding: "Funding",
  role_change: "New Role",
  event: "Event",
}

const SIGNAL_COLORS: Record<SignalType, string> = {
  hiring: "bg-blue-100 text-blue-700",
  pain_point: "bg-orange-100 text-orange-700",
  competitor_engagement: "bg-purple-100 text-purple-700",
  funding: "bg-green-100 text-green-700",
  role_change: "bg-yellow-100 text-yellow-700",
  event: "bg-pink-100 text-pink-700",
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : score >= 50
        ? "bg-yellow-100 text-yellow-700 border-yellow-200"
        : "bg-gray-100 text-gray-500 border-gray-200"

  return (
    <span className={`inline-flex items-center justify-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${color}`}>
      {score}
    </span>
  )
}

type LeadCardProps = {
  lead: Lead
  onSave: (id: string) => void
  onDismiss: (id: string) => void
  onClick: (id: string) => void
}

export function LeadCard({ lead, onSave, onDismiss, onClick }: LeadCardProps) {
  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white/60 p-4 backdrop-blur-sm transition-colors hover:bg-white/80 cursor-pointer"
      onClick={() => onClick(lead.id)}
    >
      <Avatar name={lead.name || "?"} photoUrl={lead.photo_url} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-gray-900">
            {lead.name || "Unknown"}
          </h3>
          <ScoreBadge score={lead.intent_score} />
          {lead.status === "new" && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
              NEW
            </span>
          )}
        </div>
        <p className="truncate text-xs text-gray-500">
          {lead.headline || "No headline"}{lead.company ? ` at ${lead.company}` : ""}
        </p>
        <p className="mt-1 line-clamp-2 text-xs text-gray-400">
          {lead.intent_summary}
        </p>

        <div className="mt-2 flex flex-wrap gap-1">
          {lead.signal_types.map((type) => (
            <span
              key={type}
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${SIGNAL_COLORS[type] ?? "bg-gray-100 text-gray-500"}`}
            >
              {SIGNAL_LABELS[type] ?? type}
            </span>
          ))}
        </div>

        {lead.signals && lead.signals.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Signals ({lead.signals.length})
            </p>
            {lead.signals.map((signal) => (
              <div
                key={signal.id}
                className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-[11px]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${SIGNAL_COLORS[signal.signal_type as SignalType] ?? "bg-gray-100 text-gray-500"}`}>
                    {SIGNAL_LABELS[signal.signal_type as SignalType] ?? signal.signal_type}
                  </span>
                  <span className="text-[10px] text-gray-300">
                    {new Date(signal.created_at).toLocaleDateString()}
                  </span>
                </div>
                {signal.title && (
                  <p className="font-medium text-gray-700">{signal.title}</p>
                )}
                {signal.snippet && (
                  <p className="mt-0.5 text-gray-500">{signal.snippet}</p>
                )}
                <a
                  href={signal.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[10px] text-purple-500 hover:text-purple-700"
                >
                  <FileText size={10} />
                  {signal.source_url}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <a
          href={lead.linkedin_url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          title="View on LinkedIn"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={14} />
        </a>
        {lead.status !== "saved" && (
          <button
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-emerald-600"
            title="Save lead"
            onClick={(e) => { e.stopPropagation(); onSave(lead.id) }}
          >
            <Bookmark size={14} />
          </button>
        )}
        {lead.status !== "dismissed" && (
          <button
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500"
            title="Dismiss lead"
            onClick={(e) => { e.stopPropagation(); onDismiss(lead.id) }}
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
