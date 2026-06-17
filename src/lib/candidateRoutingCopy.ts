/** UI copy for candidates in second-choice review (failed 1st choice, not passed it). */

export const SECOND_CHOICE_BADGE_LABEL = '2nd choice review';

export function secondChoiceTooltip(choice1: string): string {
  return `Did not pass ${choice1}. Now under second-choice review in your department.`;
}

export const SECOND_CHOICE_BANNER_TITLE = 'Second-choice review';

export function secondChoiceBannerMessage(choice1: string): string {
  return `This candidate did not pass ${choice1}. They are now under review for their second department choice.`;
}

export function rerouteConfirmMessage(targetDepartment: string): string {
  return `Mark as Fail at the first-choice department and send this candidate to ${targetDepartment} for second-choice review?`;
}

export function rerouteSuccessMessage(targetDepartment: string): string {
  return `Candidate did not pass their first choice. Sent to ${targetDepartment} for second-choice review (status: Pending).`;
}
