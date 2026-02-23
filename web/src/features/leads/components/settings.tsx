import { useState, useEffect } from "react"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { useIcp } from "../hooks/use-icp"
import { useUpdateIcp } from "../hooks/use-update-icp"

export function Settings() {
  const { data: icp, isLoading } = useIcp()
  const updateIcp = useUpdateIcp()
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
        <Loader2 className="animate-spin text-white/40" size={32} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <h1 className="text-xl font-bold text-white">Settings</h1>

      <div className="rounded-xl border border-white/5 bg-white/5 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-sm font-semibold text-white">Ideal Customer Profile</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
              placeholder="Describe your ideal customer..."
            />
          </div>

          {icp?.parsed_config && (
            <div className="space-y-2 text-xs text-white/40">
              <p><strong className="text-white/60">Parsed titles:</strong> {(icp.parsed_config as any).titles?.join(", ") || "\u2014"}</p>
              <p><strong className="text-white/60">Industries:</strong> {(icp.parsed_config as any).industries?.join(", ") || "\u2014"}</p>
              <p><strong className="text-white/60">Keywords:</strong> {(icp.parsed_config as any).keywords?.join(", ") || "\u2014"}</p>
              <p><strong className="text-white/60">Competitors:</strong> {(icp.parsed_config as any).competitors?.join(", ") || "\u2014"}</p>
              <p><strong className="text-white/60">Queries:</strong> {(icp.search_queries as any)?.length ?? 0} generated</p>
            </div>
          )}

          <button
            type="submit"
            disabled={updateIcp.isPending || prompt.trim() === icp?.raw_prompt}
            className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-50"
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
    </div>
  )
}
