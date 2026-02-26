import type { SignalDetector } from "../../types.js"
import { competitorPostComment } from "./competitor-post-comment.js"
import { solutionQuestionComment } from "./solution-question-comment.js"
import { reactionSeries } from "./reaction-series.js"
import { negativeToolSentiment } from "./negative-tool-sentiment.js"

export const contentEngagementDetectors: SignalDetector[] = [
  competitorPostComment,
  solutionQuestionComment,
  reactionSeries,
  negativeToolSentiment,
]
