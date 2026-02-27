import { useState, useCallback, type KeyboardEvent } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ArrowLeft, Loader2, Rocket, X, Plus } from "lucide-react"
import { leadsApi } from "../lib/api-client"
import type { OnboardingState, OnboardingCompleteResponse } from "@solomakers/shared"

const EMPTY_STATE: OnboardingState = {
  companyName: null,
  companyLinkedInUrl: null,
  businessType: null,
  teamProfiles: [],
  targetJobTitles: [],
  targetIndustries: [],
  targetCompanySize: null,
  targetLocations: [],
  problemKeywords: [],
  productCategoryPhrases: [],
  industryHashtags: [],
  competitors: [],
  targetAccounts: [],
  existingCustomers: [],
  thoughtLeaders: [],
  hiringSignalRoles: [],
  targetTechStack: [],
  industryEvents: [],
  linkedInGroups: [],
  fiscalYearStart: null,
}

const COMPANY_SIZE_OPTIONS = [
  { value: "", label: "Select..." },
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-1000", label: "201-1000 employees" },
  { value: "1000+", label: "1000+ employees" },
]

function loadStateFromStorage(): OnboardingState {
  try {
    const saved = localStorage.getItem("onboarding_state")
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed.state) return { ...EMPTY_STATE, ...parsed.state }
    }
  } catch {}
  return EMPTY_STATE
}

function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder: string
}) {
  const [input, setInput] = useState("")

  const addTag = useCallback(() => {
    const trimmed = input.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInput("")
  }, [input, value, onChange])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTag()
    }
    if (e.key === "Backspace" && input === "" && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 transition-colors focus-within:border-purple-400 focus-within:ring-1 focus-within:ring-purple-100">
      {value.map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(i)}
            className="rounded-sm text-purple-400 transition-colors hover:text-purple-700"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <div className="flex min-w-[120px] flex-1 items-center gap-1">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-0 flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-300"
        />
        {input.trim() && (
          <button
            type="button"
            onClick={addTag}
            className="rounded p-0.5 text-gray-300 transition-colors hover:text-purple-500"
          >
            <Plus size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

function CompetitorTagInput({
  value,
  onChange,
  placeholder,
}: {
  value: { name: string; linkedInUrl?: string; source: "user" | "ai-suggested" }[]
  onChange: (tags: { name: string; linkedInUrl?: string; source: "user" | "ai-suggested" }[]) => void
  placeholder: string
}) {
  const [input, setInput] = useState("")

  const addTag = useCallback(() => {
    const trimmed = input.trim()
    if (trimmed && !value.some((c) => c.name === trimmed)) {
      onChange([...value, { name: trimmed, source: "user" }])
    }
    setInput("")
  }, [input, value, onChange])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTag()
    }
    if (e.key === "Backspace" && input === "" && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 transition-colors focus-within:border-purple-400 focus-within:ring-1 focus-within:ring-purple-100">
      {value.map((tag, i) => (
        <span
          key={i}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
            tag.source === "ai-suggested"
              ? "bg-blue-50 text-blue-700"
              : "bg-purple-50 text-purple-700"
          }`}
        >
          {tag.name}
          <button
            type="button"
            onClick={() => removeTag(i)}
            className="rounded-sm text-current opacity-50 transition-opacity hover:opacity-100"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <div className="flex min-w-[120px] flex-1 items-center gap-1">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-0 flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-300"
        />
        {input.trim() && (
          <button
            type="button"
            onClick={addTag}
            className="rounded p-0.5 text-gray-300 transition-colors hover:text-purple-500"
          >
            <Plus size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

function FormField({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

export function OnboardingForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [state, setState] = useState<OnboardingState>(loadStateFromStorage)

  const completeMutation = useMutation({
    mutationFn: () =>
      leadsApi<OnboardingCompleteResponse>("/onboarding/complete", {
        method: "POST",
        body: JSON.stringify({ state }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["icp"] })
      queryClient.invalidateQueries({ queryKey: ["leads"] })
      localStorage.removeItem("onboarding_state")
    },
  })

  const hasRequiredFields =
    state.targetJobTitles.length > 0 &&
    state.targetIndustries.length > 0 &&
    state.problemKeywords.length > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!hasRequiredFields) return
    completeMutation.mutate()
    toast.success("ICP created! Finding your first leads...")
    navigate("/")
  }

  if (completeMutation.isSuccess) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="mx-auto mb-4 animate-spin text-purple-500" />
          <p className="text-gray-500">Setting up your lead intelligence...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Back link */}
      <button
        onClick={() => navigate("/")}
        className="mb-6 flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-purple-600"
      >
        <ArrowLeft size={14} />
        Back to chat
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Set up your ICP manually
        </h1>
        <p className="mt-1.5 text-sm text-gray-400">
          Fill in the fields below to define your Ideal Customer Profile. Fields marked with{" "}
          <span className="text-red-400">*</span> are required.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Name */}
        <FormField label="Your company name" hint="The company you're selling from">
          <input
            type="text"
            value={state.companyName ?? ""}
            onChange={(e) => setState((s) => ({ ...s, companyName: e.target.value || null }))}
            placeholder="e.g. Acme Corp"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition-colors placeholder:text-gray-300 focus:border-purple-400 focus:ring-1 focus:ring-purple-100"
          />
        </FormField>

        <hr className="border-gray-100" />

        {/* Target Job Titles */}
        <FormField
          label="Target job titles"
          hint="Press Enter or comma to add. e.g. CMO, VP Marketing, Head of Growth"
          required
        >
          <TagInput
            value={state.targetJobTitles}
            onChange={(tags) => setState((s) => ({ ...s, targetJobTitles: tags }))}
            placeholder="e.g. CMO, VP Marketing"
          />
        </FormField>

        {/* Target Industries */}
        <FormField
          label="Target industries"
          hint="Which industries are your ideal customers in?"
          required
        >
          <TagInput
            value={state.targetIndustries}
            onChange={(tags) => setState((s) => ({ ...s, targetIndustries: tags }))}
            placeholder="e.g. SaaS, E-commerce, FinTech"
          />
        </FormField>

        {/* Problem Keywords */}
        <FormField
          label="Problem keywords"
          hint="Pain points your prospects talk about online"
          required
        >
          <TagInput
            value={state.problemKeywords}
            onChange={(tags) => setState((s) => ({ ...s, problemKeywords: tags }))}
            placeholder='e.g. "low conversion", "high churn"'
          />
        </FormField>

        <hr className="border-gray-100" />

        {/* Competitors */}
        <FormField
          label="Competitors"
          hint="Companies your prospects might be using instead"
        >
          <CompetitorTagInput
            value={state.competitors}
            onChange={(tags) => setState((s) => ({ ...s, competitors: tags }))}
            placeholder="e.g. HubSpot, Salesforce"
          />
        </FormField>

        {/* Product Category Phrases */}
        <FormField
          label="How prospects describe your solution"
          hint="Phrases people use when searching for tools like yours"
        >
          <TagInput
            value={state.productCategoryPhrases}
            onChange={(tags) => setState((s) => ({ ...s, productCategoryPhrases: tags }))}
            placeholder='e.g. "marketing automation", "CRM tool"'
          />
        </FormField>

        <hr className="border-gray-100" />

        {/* Company Size */}
        <FormField label="Target company size">
          <select
            value={state.targetCompanySize ?? ""}
            onChange={(e) =>
              setState((s) => ({ ...s, targetCompanySize: e.target.value || null }))
            }
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition-colors focus:border-purple-400 focus:ring-1 focus:ring-purple-100"
          >
            {COMPANY_SIZE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Target Locations */}
        <FormField
          label="Target locations"
          hint="Geographic regions where your ideal customers are based"
        >
          <TagInput
            value={state.targetLocations}
            onChange={(tags) => setState((s) => ({ ...s, targetLocations: tags }))}
            placeholder="e.g. Poland, Germany, USA"
          />
        </FormField>

        {/* Submit */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-6">
          <p className="text-xs text-gray-400">
            {hasRequiredFields
              ? "Ready to start finding leads"
              : "Fill required fields to continue"}
          </p>
          <button
            type="submit"
            disabled={!hasRequiredFields || completeMutation.isPending}
            className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {completeMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Rocket size={16} />
                Start hunting
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
