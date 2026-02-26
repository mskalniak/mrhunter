import type { SignalDetector } from "../../types.js"
import { keyRoleJobPosting } from "./key-role-job-posting.js"
import { jobPostingSeries } from "./job-posting-series.js"
import { toolRequirementJob } from "./tool-requirement-job.js"

export const hiringDetectors: SignalDetector[] = [
  keyRoleJobPosting,
  jobPostingSeries,
  toolRequirementJob,
]
