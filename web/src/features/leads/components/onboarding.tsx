import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Loader2, Rocket } from "lucide-react"
import { useOnboardingChat } from "../hooks/use-onboarding-chat"
import { OnboardingChat } from "./onboarding-chat"
import { IntentDashboard } from "./intent-dashboard"

export function Onboarding() {
  const navigate = useNavigate()
  const {
    chatHistory,
    intentSummary,
    sendMessage,
    completeOnboarding,
    isSending,
    isCompleting,
    isComplete,
    hasRequiredFields,
    sendError,
  } = useOnboardingChat()

  function handleComplete() {
    completeOnboarding()
    toast.success("ICP created! Finding your first leads...")
    navigate("/")
  }

  if (isComplete) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="mx-auto mb-4 animate-spin text-purple-500" />
          <p className="text-gray-500">Setting up your lead intelligence...</p>
        </div>
      </div>
    )
  }

  const progress = Math.round((intentSummary.total / intentSummary.maxTotal) * 100)

  let buttonLabel = "Fill required fields to continue..."
  let buttonEnabled = false
  if (hasRequiredFields && progress < 50) {
    buttonLabel = `Start with ${intentSummary.total}/${intentSummary.maxTotal} intents`
    buttonEnabled = true
  } else if (hasRequiredFields && progress >= 50 && progress < 80) {
    buttonLabel = `Start hunting (${intentSummary.total}/${intentSummary.maxTotal} intents)`
    buttonEnabled = true
  } else if (hasRequiredFields && progress >= 80) {
    buttonLabel = `Start — great setup! (${intentSummary.total}/${intentSummary.maxTotal})`
    buttonEnabled = true
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Mobile intent summary */}
      <div className="flex items-center gap-3 border-b border-gray-100 bg-white/60 px-4 py-2 backdrop-blur-sm lg:hidden">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-purple-500 transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="whitespace-nowrap text-xs font-medium tabular-nums text-gray-600">
          {intentSummary.total}/{intentSummary.maxTotal} intents
        </span>
        {intentSummary.critical > 0 && (
          <span className="flex items-center gap-1 text-xs text-red-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
            {intentSummary.critical}
          </span>
        )}
      </div>

      {/* Main content: chat + dashboard */}
      <div className="flex min-h-0 flex-1">
        {/* Left: Chat */}
        <div className="flex flex-1 flex-col border-r border-gray-100">
          <OnboardingChat
            chatHistory={chatHistory}
            onSendMessage={sendMessage}
            isSending={isSending}
            error={sendError}
          />
        </div>

        {/* Right: Intent Dashboard */}
        <div className="hidden w-80 flex-shrink-0 border-l border-gray-100 bg-white/40 backdrop-blur-sm lg:block xl:w-96">
          <IntentDashboard summary={intentSummary} />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between border-t border-gray-100 bg-white/80 px-6 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-purple-500 transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-gray-400">
            {intentSummary.total}/{intentSummary.maxTotal} intents
          </span>
        </div>

        <button
          onClick={handleComplete}
          disabled={!buttonEnabled || isCompleting}
          className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCompleting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Rocket size={16} />
              {buttonLabel}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
