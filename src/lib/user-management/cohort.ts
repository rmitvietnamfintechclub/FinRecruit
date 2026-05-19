import { createHash } from 'crypto';
import {
  UM_GENERATIONS,
  UM_SEMESTERS,
} from '@/lib/user-management/mock-store';

/**
 * Stable pseudo cohort for list filtering until User has semester/generation fields.
 */
export function cohortForUserId(userId: string): {
  semester: string;
  generation: string;
} {
  const h = createHash('sha256').update(userId).digest();
  const si = h[0]! % UM_SEMESTERS.length;
  const gi = h[1]! % UM_GENERATIONS.length;
  return {
    semester: UM_SEMESTERS[si]!,
    generation: UM_GENERATIONS[gi]!,
  };
}
