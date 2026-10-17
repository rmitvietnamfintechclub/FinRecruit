/** UI copy for candidates in second-choice review (failed 1st choice, not passed it). */
export const SECOND_CHOICE_BADGE_LABEL = '2nd Choice';

export function secondChoiceTooltip(choice1: string): string {
  return `Forwarded from ${choice1}. Now under review for their 2nd choice.`;
}

export const SECOND_CHOICE_BANNER_TITLE = '2nd Choice Application';

export function secondChoiceBannerMessage(choice1: string): string {
  return `This candidate was not selected for ${choice1} (1st choice). They are now being evaluated for your department.`;
}

export function rerouteConfirmMessage(targetDepartment: string): string {
  return `Reject for your department and automatically forward this candidate to ${targetDepartment} for 2nd choice review?`;
}

export function rerouteSuccessMessage(targetDepartment: string): string {
  return `Candidate successfully forwarded to ${targetDepartment} for 2nd choice review.`;
}
