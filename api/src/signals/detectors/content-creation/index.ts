import type { SignalDetector } from "../../types.js"
import { problemSolvingPost } from "./problem-solving-post.js"
import { networkRecommendationPost } from "./network-recommendation-post.js"
import { toolFrustrationPost } from "./tool-frustration-post.js"
import { demoTrialRequestPost } from "./demo-trial-request-post.js"

export const contentCreationDetectors: SignalDetector[] = [
  problemSolvingPost,
  networkRecommendationPost,
  toolFrustrationPost,
  demoTrialRequestPost,
]
