import { useState } from "react"
import { Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { useLeads } from "../hooks/use-leads"
import { useUpdateLead } from "../hooks/use-update-lead"
import { useSearchRun } from "../hooks/use-search-run"
import { useSearchHistory } from "../hooks/use-search-history"
import { LeadCard } from "./lead-card"
import { LeadFilters } from "./lead-filters"

type FiltersState = {
  status?: string
  signal_type?: string
  min_score?: number
}

export function LeadsDashboard() {
  const [filters, setFilters] = useState<FiltersState>({})
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  const { data, isLoading, error } = useLeads({
    ...filters,
    per_page: 50,
  })
  const updateLead = useUpdateLead()
  const searchRun = useSearchRun()
  const { data: searchHistory } = useSearchHistory()

  const latestRun = searchHistory?.[0]
  const isSearching = latestRun?.status === "running"

  function handleRunSearch() {
    searchRun.mutate(undefined, {
      onSuccess: () => {
        toast.success("Search started! New leads will appear shortly.")
      },
      onError: (error) => {
        toast.error(error.message || "Failed to start search")
      },
    })
  }

  function handleSave(leadId: string) {
    updateLead.mutate({ leadId, status: "saved" }, {
      onSuccess: () => toast.success("Lead saved"),
    })
  }

  function handleDismiss(leadId: string) {
    updateLead.mutate({ leadId, status: "dismissed" }, {
      onSuccess: () => toast.success("Lead dismissed"),
    })
  }

  function handleLeadClick(leadId: string) {
    setSelectedLeadId(leadId === selectedLeadId ? null : leadId)
    // Mark as viewed
    const lead = data?.leads.find((l) => l.id === leadId)
    if (lead?.status === "new") {
      updateLead.mutate({ leadId, status: "viewed" })
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-white/40" size={32} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-red-400">Failed to load leads: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Leads</h1>
          {latestRun && (
            <p className="text-xs text-white/40">
              Last search: {new Date(latestRun.started_at).toLocaleString()}
              {latestRun.status === "completed" && ` \u00B7 ${latestRun.leads_created} new leads`}
            </p>
          )}
        </div>

        <button
          onClick={handleRunSearch}
          disabled={searchRun.isPending || isSearching}
          className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20 disabled:opacity-50"
        >
          <RefreshCw size={14} className={isSearching ? "animate-spin" : ""} />
          {isSearching ? "Searching..." : "Run Search"}
        </button>
      </div>

      {/* Filters */}
      <LeadFilters
        filters={filters}
        onChange={setFilters}
        total={data?.total ?? 0}
      />

      {/* Lead list */}
      {data?.leads.length === 0 ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-white/50">No leads found yet.</p>
            <p className="mt-1 text-xs text-white/30">
              {isSearching
                ? "A search is running \u2014 leads will appear soon."
                : "Click 'Run Search' to find leads matching your ICP."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {data?.leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onSave={handleSave}
              onDismiss={handleDismiss}
              onClick={handleLeadClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}
