import type { IntentSummary } from "@solomakers/shared"

type IntentDashboardProps = {
  summary: IntentSummary
}

export function IntentDashboard({ summary }: IntentDashboardProps) {
  const progress = Math.round((summary.total / summary.maxTotal) * 100)

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      {/* Main counter */}
      <div>
        <div className="mb-2 flex items-baseline gap-2">
          <span className="text-4xl font-bold text-gray-900 transition-all duration-500">
            {summary.total}
          </span>
          <span className="text-lg text-gray-400">/ {summary.maxTotal}</span>
        </div>
        <p className="mb-3 text-sm text-gray-500">intent signals unlocked</p>
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-purple-500 transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Critical / High counters */}
      {(summary.critical > 0 || summary.high > 0) && (
        <div className="flex gap-4 text-sm">
          {summary.critical > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="text-gray-600">{summary.critical} critical</span>
            </div>
          )}
          {summary.high > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-400" />
              <span className="text-gray-600">{summary.high} high</span>
            </div>
          )}
        </div>
      )}

      {/* Category breakdown */}
      {summary.categories.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Categories
          </h3>
          <div className="space-y-2.5">
            {summary.categories.map(cat => (
              <div key={cat.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {cat.unlocked > 0 ? "✅" : "⬜"} {cat.label}
                  </span>
                  <span className="tabular-nums text-gray-400">
                    {cat.unlocked}/{cat.max}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-purple-400 transition-all duration-500 ease-out"
                    style={{ width: cat.max > 0 ? `${(cat.unlocked / cat.max) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hint */}
      {summary.hint && (
        <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4">
          <p className="text-sm text-purple-700">
            💡 {summary.hint}
          </p>
        </div>
      )}
    </div>
  )
}
