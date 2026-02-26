import type { SignalDetector } from "./types.js"
import { contentEngagementDetectors } from "./detectors/content-engagement/index.js"
import { contentCreationDetectors } from "./detectors/content-creation/index.js"
import { careerChangeDetectors } from "./detectors/career-changes/index.js"
import { hiringDetectors } from "./detectors/hiring/index.js"

export const allDetectors: SignalDetector[] = [
  ...contentEngagementDetectors,
  ...contentCreationDetectors,
  ...careerChangeDetectors,
  ...hiringDetectors,
]
