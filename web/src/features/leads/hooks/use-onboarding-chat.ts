import { useState, useCallback } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { leadsApi } from "../lib/api-client"
import type {
  OnboardingState,
  ChatMessage,
  OnboardingChatResponse,
  IntentSummary,
  OnboardingCompleteResponse,
} from "@solomakers/shared"

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

const INITIAL_INTENT_SUMMARY: IntentSummary = {
  total: 5,
  maxTotal: 107,
  critical: 0,
  high: 1,
  categories: [],
  hint: "Tell me about your business to start unlocking intent signals",
}

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Cześć! 👋 Jestem tu, żeby skonfigurować Twoje intent signals — sygnały, dzięki którym będziesz rozmawiać z ludźmi, którzy WŁAŚNIE szukają tego, co oferujesz.\n\nPowiedz mi w kilku zdaniach: czym się zajmujesz i kogo szukasz jako klientów?\n\nNa przykład: \"Prowadzę agencję SEO, szukam właścicieli e-commerce B2C w Polsce z min. 50 pracownikami\"",
}

export function useOnboardingChat() {
  const queryClient = useQueryClient()
  const [onboardingState, setOnboardingState] = useState<OnboardingState>(EMPTY_STATE)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([WELCOME_MESSAGE])
  const [intentSummary, setIntentSummary] = useState<IntentSummary>(INITIAL_INTENT_SUMMARY)

  const chatMutation = useMutation({
    mutationFn: (message: string) =>
      leadsApi<OnboardingChatResponse>("/onboarding/chat", {
        method: "POST",
        body: JSON.stringify({
          message,
          currentState: onboardingState,
          chatHistory: chatHistory.filter(m => m !== WELCOME_MESSAGE),
        }),
      }),
    onSuccess: (data, message) => {
      setChatHistory(prev => [
        ...prev,
        { role: "user", content: message },
        { role: "assistant", content: data.reply },
      ])

      if (data.stateUpdates && Object.keys(data.stateUpdates).length > 0) {
        setOnboardingState(prev => ({ ...prev, ...data.stateUpdates }))
      }

      setIntentSummary(data.intentSummary)

      try {
        localStorage.setItem("onboarding_state", JSON.stringify({
          state: { ...onboardingState, ...data.stateUpdates },
          history: [
            ...chatHistory,
            { role: "user", content: message },
            { role: "assistant", content: data.reply },
          ],
          intentSummary: data.intentSummary,
        }))
      } catch {}
    },
  })

  const completeMutation = useMutation({
    mutationFn: () =>
      leadsApi<OnboardingCompleteResponse>("/onboarding/complete", {
        method: "POST",
        body: JSON.stringify({ state: onboardingState }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["icp"] })
      queryClient.invalidateQueries({ queryKey: ["leads"] })
      localStorage.removeItem("onboarding_state")
    },
  })

  const sendMessage = useCallback((message: string) => {
    chatMutation.mutate(message)
  }, [chatMutation])

  const completeOnboarding = useCallback(() => {
    completeMutation.mutate()
  }, [completeMutation])

  // Enable after first question — Claude auto-extracts these from the first message
  const hasRequiredFields =
    onboardingState.targetJobTitles.length > 0 ||
    onboardingState.targetIndustries.length > 0 ||
    onboardingState.problemKeywords.length > 0

  return {
    chatHistory,
    intentSummary,
    onboardingState,
    sendMessage,
    completeOnboarding,
    isSending: chatMutation.isPending,
    isCompleting: completeMutation.isPending,
    isComplete: completeMutation.isSuccess,
    hasRequiredFields,
    sendError: chatMutation.error,
    completeError: completeMutation.error,
  }
}
