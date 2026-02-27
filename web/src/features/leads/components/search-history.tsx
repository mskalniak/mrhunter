import { Loader2 } from "lucide-react"
import { useSearchHistory } from "../hooks/use-search-history"

export function SearchHistory() {
  const { data: runs, isLoading } = useSearchHistory()

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900">Search History</h1>

      {(!runs || runs.length === 0) ? (
        <p className="text-sm text-gray-400">No searches yet.</p>
      ) : (
        <div className="space-y-2">
          {runs.map((run) => (
            <div
              key={run.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white/60 px-4 py-3 backdrop-blur-sm"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${
                    run.status === "completed" ? "bg-emerald-400" :
                    run.status === "running" ? "bg-yellow-400 animate-pulse" :
                    "bg-red-400"
                  }`} />
                  <span className="text-sm font-medium text-gray-700">
                    {run.trigger_type === "cron" ? "Scheduled" : "Manual"} search
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-400">
                  {new Date(run.started_at).toLocaleString()}
                </p>
              </div>

              <div className="text-right text-xs text-gray-400">
                <p>{run.queries_used} queries</p>
                <p>{run.signals_found} signals {"\u00B7"} {run.leads_created} new leads</p>
                {run.error && (
                  <p className="text-red-400">{run.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
