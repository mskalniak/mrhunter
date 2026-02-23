import { ExternalLink, Bookmark, X } from "lucide-react"
import type { Lead, SignalType } from "../types"

const SIGNAL_LABELS: Record<SignalType, string> = {
  hiring: "Hiring",
  pain_point: "Pain Point",
  competitor_engagement: "Competitor",
  funding: "Funding",
  role_change: "New Role",
  event: "Event",
}

const SIGNAL_COLORS: Record<SignalType, string> = {
  hiring: "bg-blue-500/20 text-blue-300",
  pain_point: "bg-orange-500/20 text-orange-300",
  competitor_engagement: "bg-purple-500/20 text-purple-300",
  funding: "bg-green-500/20 text-green-300",
  role_change: "bg-yellow-500/20 text-yellow-300",
  event: "bg-pink-500/20 text-pink-300",
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
      : score >= 50
        ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
        : "bg-white/10 text-white/50 border-white/10"

  return (
    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-bold ${color}`}>
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
      className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 p-4 backdrop-blur-sm transition-colors hover:bg-white/[0.07] cursor-pointer"
      onClick={() => onClick(lead.id)}
    >
      <ScoreBadge score={lead.intent_score} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-white">
            {lead.name || "Unknown"}
          </h3>
          {lead.status === "new" && (
            <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-300">
              NEW
            </span>
          )}
        </div>
        <p className="truncate text-xs text-white/50">
          {lead.headline || "No headline"}{lead.company ? ` at ${lead.company}` : ""}
        </p>
        <p className="mt-1 line-clamp-2 text-xs text-white/40">
          {lead.intent_summary}
        </p>

        <div className="mt-2 flex flex-wrap gap-1">
          {lead.signal_types.map((type) => (
            <span
              key={type}
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${SIGNAL_COLORS[type] ?? "bg-white/10 text-white/50"}`}
            >
              {SIGNAL_LABELS[type] ?? type}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <a
          href={lead.linkedin_url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
          title="View on LinkedIn"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={14} />
        </a>
        {lead.status !== "saved" && (
          <button
            className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-emerald-400"
            title="Save lead"
            onClick={(e) => { e.stopPropagation(); onSave(lead.id) }}
          >
            <Bookmark size={14} />
          </button>
        )}
        {lead.status !== "dismissed" && (
          <button
            className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-red-400"
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
