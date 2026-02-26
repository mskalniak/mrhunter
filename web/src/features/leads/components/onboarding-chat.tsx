import { useState, useRef, useEffect } from "react"
import { Send, Loader2, SkipForward } from "lucide-react"
import type { ChatMessage } from "@solomakers/shared"

type OnboardingChatProps = {
  chatHistory: ChatMessage[]
  onSendMessage: (message: string) => void
  isSending: boolean
  error: Error | null
}

export function OnboardingChat({
  chatHistory,
  onSendMessage,
  isSending,
  error,
}: OnboardingChatProps) {
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatHistory, isSending])

  useEffect(() => {
    if (!isSending) {
      inputRef.current?.focus()
    }
  }, [isSending])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isSending) return
    onSendMessage(trimmed)
    setInput("")
  }

  function handleSkip() {
    if (isSending) return
    onSendMessage("skip")
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-lg space-y-4">
          {chatHistory.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-500">
                <Loader2 size={14} className="animate-spin" />
                Thinking...
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                Something went wrong. Try sending your message again.
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 bg-white/80 p-4 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-lg items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={1}
            disabled={isSending}
            className="flex-1 resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-300 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSkip}
            disabled={isSending}
            className="rounded-xl border border-gray-200 px-3 py-3 text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-600 disabled:opacity-50"
            title="Skip this question"
          >
            <SkipForward size={16} />
          </button>
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="rounded-xl bg-purple-600 px-3 py-3 text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}
