import type { SignalDetector } from "../../types.js"
import { profileMatch } from "./profile-match.js"

export const icpMatchDetectors: SignalDetector[] = [
  profileMatch,
]
