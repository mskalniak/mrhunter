import type { SignalType, LeadStatus } from "../types"

type FiltersState = {
  status?: string
  signal_type?: string
  min_score?: number
}

type LeadFiltersProps = {
  filters: FiltersState
  onChange: (filters: FiltersState) => void
  total: number
}

const SIGNAL_OPTIONS: { value: SignalType; label: string }[] = [
  { value: "hiring", label: "Hiring" },
  { value: "pain_point", label: "Pain Point" },
  { value: "competitor_engagement", label: "Competitor" },
  { value: "funding", label: "Funding" },
  { value: "role_change", label: "New Role" },
  { value: "event", label: "Event" },
  { value: "icp_match", label: "ICP Match" },
]

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "viewed", label: "Viewed" },
  { value: "saved", label: "Saved" },
  { value: "dismissed", label: "Dismissed" },
]

export function LeadFilters({ filters, onChange, total }: LeadFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs text-gray-400">{total} leads</span>

      <select
        value={filters.signal_type ?? ""}
        onChange={(e) => onChange({ ...filters, signal_type: e.target.value || undefined })}
        className="rounded-lg border border-gray-200 bg-white/60 px-3 py-1.5 text-xs text-gray-700 focus:outline-none"
      >
        <option value="">All Signals</option>
        {SIGNAL_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <select
        value={filters.status ?? ""}
        onChange={(e) => onChange({ ...filters, status: e.target.value || undefined })}
        className="rounded-lg border border-gray-200 bg-white/60 px-3 py-1.5 text-xs text-gray-700 focus:outline-none"
      >
        <option value="">All Status</option>
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <select
        value={filters.min_score ?? 0}
        onChange={(e) => onChange({ ...filters, min_score: Number(e.target.value) || undefined })}
        className="rounded-lg border border-gray-200 bg-white/60 px-3 py-1.5 text-xs text-gray-700 focus:outline-none"
      >
        <option value="0">Any Score</option>
        <option value="50">50+</option>
        <option value="70">70+</option>
        <option value="80">80+</option>
        <option value="90">90+</option>
      </select>
    </div>
  )
}
