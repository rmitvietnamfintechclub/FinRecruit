/** Edge-safe: không import mongoose. */
export type AppRole = 'Guest' | 'Department Head' | 'Executive Board';

export function getHomePathForRole(
  role: AppRole | undefined | null
): string {
  if (role === 'Guest') {
    return '/waiting-room';
  }
  if (role === 'Department Head') {
    return '/HeadDashboard';
  }
  if (role === 'Executive Board') {
    return '/MasterViewDashboard';
  }
  return '/loginPage';
}
