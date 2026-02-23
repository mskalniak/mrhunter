import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import { useCreateIcp } from "../hooks/use-create-icp"

export function Onboarding() {
  const [prompt, setPrompt] = useState("")
  const createIcp = useCreateIcp()
  const navigate = useNavigate()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (prompt.trim().length < 10) {
      toast.error("Please describe your ideal customer in more detail")
      return
    }

    createIcp.mutate(prompt.trim(), {
      onSuccess: () => {
        toast.success("ICP created! Finding your first leads...")
        navigate("/")
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create ICP profile")
      },
    })
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Welcome to Cauliflower
          </h1>
          <p className="mt-2 text-base text-white/60">
            Describe your ideal customer and we'll start finding high-intent leads on LinkedIn.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="icp-prompt"
              className="mb-2 block text-sm font-medium text-white/80"
            >
              Who is your ideal customer?
            </label>
            <textarea
              id="icp-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. CTOs and VPs of Engineering at B2B SaaS startups with 10-200 employees who need better developer tooling. Competitors include LinearB and Sleuth."
              rows={5}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 backdrop-blur-sm focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
              disabled={createIcp.isPending}
            />
            <p className="mt-1 text-xs text-white/40">
              Include job titles, industries, company size, pain points, and competitor names for best results.
            </p>
          </div>

          <button
            type="submit"
            disabled={createIcp.isPending || prompt.trim().length < 10}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-6 py-3 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createIcp.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Analyzing your ICP...
              </>
            ) : (
              <>
                <Search size={16} />
                Start Hunting
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
