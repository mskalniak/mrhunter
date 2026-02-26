import type { SignalDetector } from "../../types.js"
import { titleChangeDecisionMaker } from "./title-change-decision-maker.js"
import { companyChange } from "./company-change.js"
import { newRoleIcpMatch } from "./new-role-icp-match.js"

export const careerChangeDetectors: SignalDetector[] = [
  titleChangeDecisionMaker,
  companyChange,
  newRoleIcpMatch,
]
