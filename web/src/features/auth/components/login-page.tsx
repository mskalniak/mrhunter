/**
 * Login Page — Glassmorphism
 *
 * Two-step passwordless login:
 *   Step 1: Enter email → receive an 8-digit code
 *   Step 2: Enter code → verify and sign in
 */

import { useState } from "react"
import { toast } from "sonner"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useLogin } from "@/features/auth/hooks/use-login"
import { useVerifyOtp } from "@/features/auth/hooks/use-verify-otp"

export function LoginPage() {
  const [step, setStep] = useState<"email" | "otp">("email")
  const [email, setEmail] = useState("")
  const [otpCode, setOtpCode] = useState("")

  const login = useLogin()
  const verifyOtp = useVerifyOtp()

  function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      toast.error("Please enter your email address")
      return
    }
    login.mutate(email.trim(), {
      onSuccess: () => {
        setStep("otp")
        toast.success("Check your email for the login code!")
      },
      onError: (error) => {
        toast.error(error.message || "Failed to send code. Please try again.")
      },
    })
  }

  function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!otpCode.trim()) {
      toast.error("Please enter the 8-digit code")
      return
    }
    verifyOtp.mutate(
      { email: email.trim(), token: otpCode.trim() },
      {
        onSuccess: () => {
          toast.success("Welcome!")
        },
        onError: (error) => {
          toast.error(
            error.message || "Invalid code. Please check and try again."
          )
        },
      }
    )
  }

  function handleBack() {
    setStep("email")
    setOtpCode("")
  }

  return (
    <div className="login-page">
      {/* Background */}
      <div className="login-bg">
        {/* Animated color blobs — visible through the glass */}
        <div className="login-blob login-blob-1" />
        <div className="login-blob login-blob-2" />
        <div className="login-blob login-blob-3" />
        <div className="login-blob login-blob-4" />
        {/* Decorative arcs */}
        <svg className="login-arcs" viewBox="0 0 1440 900" fill="none" preserveAspectRatio="none">
          <ellipse cx="200" cy="100" rx="500" ry="400" stroke="rgba(220,160,180,0.35)" strokeWidth="1.5" />
          <ellipse cx="1300" cy="200" rx="400" ry="350" stroke="rgba(200,170,150,0.25)" strokeWidth="1" />
          <ellipse cx="300" cy="850" rx="550" ry="450" stroke="rgba(190,160,140,0.3)" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Glass card */}
      <div className="login-center">
        <div className="login-card">
          {/* Left: Branding */}
          <div className="login-brand">
            <p className="login-logo">Cauliflower</p>
            <h1 className="login-heading">
              Lead<br />
              <span className="login-heading-bold">Intelligence.</span>
            </h1>
            <p className="login-tagline">
              {step === "email"
                ? "Find high-intent B2B leads on LinkedIn with AI-powered intent signal detection."
                : "We've sent a verification code to your inbox. Enter it on the right to continue."}
            </p>
            <p className="login-url">CAULIFLOWER.APP</p>
          </div>

          {/* Right: Form */}
          <div className="login-form-area">
            <h2 className="login-form-title">
              {step === "email" ? "Welcome Back" : "Verify Code"}
            </h2>
            <p className="login-form-subtitle">
              {step === "email"
                ? "Sign in to start hunting leads"
                : "Check your email for the code"}
            </p>

            {step === "email" && (
              <form onSubmit={handleSendOtp} className="login-form">
                <div className="login-field">
                  <label htmlFor="email">EMAIL ADDRESS</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="login-submit"
                  disabled={login.isPending}
                >
                  {login.isPending ? (
                    <>
                      <Loader2 className="login-spinner" />
                      Sending...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={handleVerifyOtp} className="login-form">
                <div className="login-field">
                  <label htmlFor="otp-code">VERIFICATION CODE</label>
                  <input
                    id="otp-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="00000000"
                    maxLength={8}
                    autoFocus
                    className="login-otp-input"
                  />
                  <p className="login-hint">
                    Sent to <strong>{email}</strong>
                  </p>
                </div>
                <button
                  type="submit"
                  className="login-submit"
                  disabled={verifyOtp.isPending}
                >
                  {verifyOtp.isPending ? (
                    <>
                      <Loader2 className="login-spinner" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Sign In"
                  )}
                </button>
                <button
                  type="button"
                  className="login-back"
                  onClick={handleBack}
                >
                  <ArrowLeft size={14} />
                  Use a different email
                </button>
              </form>
            )}

            <div className="login-footer">
              <span>Privacy Policy</span>
              <span className="login-footer-dot" />
              <span>Support</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
