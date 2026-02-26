import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2, Save, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { useIcp } from "../hooks/use-icp"
import { useUpdateIcp } from "../hooks/use-update-icp"
import { useResetIcp } from "../hooks/use-reset-icp"

export function Settings() {
  const navigate = useNavigate()
  const { data: icp, isLoading } = useIcp()
  const updateIcp = useUpdateIcp()
  const resetIcp = useResetIcp()
  const [prompt, setPrompt] = useState("")

  useEffect(() => {
    if (icp?.raw_prompt) {
      setPrompt(icp.raw_prompt)
    }
  }, [icp?.raw_prompt])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!icp) return

    updateIcp.mutate(
      { icpId: icp.id, rawPrompt: prompt.trim() },
      {
        onSuccess: () => toast.success("ICP updated! Run a new search to find updated leads."),
        onError: (error) => toast.error(error.message || "Failed to update ICP"),
      }
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900">Settings</h1>

      <div className="rounded-xl border border-gray-200 bg-white/60 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Ideal Customer Profile</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              className="w-full rounded-xl border border-gray-200 bg-white/60 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-300"
              placeholder="Describe your ideal customer..."
            />
          </div>

          {icp?.parsed_config && (
            <div className="space-y-2 text-xs text-gray-400">
              <p><strong className="text-gray-500">Parsed titles:</strong> {(icp.parsed_config as any).titles?.join(", ") || "\u2014"}</p>
              <p><strong className="text-gray-500">Industries:</strong> {(icp.parsed_config as any).industries?.join(", ") || "\u2014"}</p>
              <p><strong className="text-gray-500">Keywords:</strong> {(icp.parsed_config as any).keywords?.join(", ") || "\u2014"}</p>
              <p><strong className="text-gray-500">Competitors:</strong> {(icp.parsed_config as any).competitors?.join(", ") || "\u2014"}</p>
              <p><strong className="text-gray-500">Queries:</strong> {(icp.search_queries as any)?.length ?? 0} generated</p>
            </div>
          )}

          <button
            type="submit"
            disabled={updateIcp.isPending || prompt.trim() === icp?.raw_prompt}
            className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
          >
            {updateIcp.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            Update ICP
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-red-100 bg-white/60 p-6 backdrop-blur-sm">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Reset ICP</h2>
        <p className="mb-4 text-sm text-gray-500">
          Start fresh with a new onboarding. Your current ICP and lead data will remain in the database but won't be active.
        </p>
        <button
          onClick={() => {
            resetIcp.mutate(undefined, {
              onSuccess: () => {
                toast.success("ICP reset. Starting fresh onboarding...")
                navigate("/")
              },
              onError: (error) => toast.error(error.message || "Failed to reset ICP"),
            })
          }}
          disabled={resetIcp.isPending}
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
        >
          {resetIcp.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RotateCcw size={14} />
          )}
          Reset & Re-onboard
        </button>
      </div>
    </div>
  )
}
