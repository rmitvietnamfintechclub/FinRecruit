/** Edge-safe: does not import mongoose. */
export type AppRole =
  | 'Guest'
  | 'Member'
  | 'Department Head'
  | 'Executive Board';

export function getHomePathForRole(
  role: AppRole | undefined | null
): string {
  if (role === 'Guest') {
    return '/waiting-room';
  }
  if (role === 'Member' || role === 'Department Head') {
    return '/HeadDashboard';
  }
  if (role === 'Executive Board') {
    return '/MasterViewDashboard';
  }
  return '/loginPage';
};