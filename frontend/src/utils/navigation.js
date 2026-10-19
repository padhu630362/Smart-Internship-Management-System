/**
 * Resolves the appropriate verified dashboard route based on user role stored in the backend/database.
 *
 * @param {string} role - User role: student, company/employer, mentor, coordinator, admin
 * @returns {string} - Relative target dashboard route
 */
export const getRoleDashboardRoute = (role) => {
  switch (role) {
    case 'admin':
      return '/admin/users';
    case 'coordinator':
      return '/dashboard';
    case 'company':
    case 'employer':
      return '/dashboard';
    case 'mentor':
      return '/dashboard';
    case 'student':
    default:
      return '/dashboard';
  }
};

/**
 * Intelligently maps in-app notification links to proper application views based on type and role.
 *
 * @param {string} link - Destination link provided with the notification
 * @param {string} type - Notification type identifier
 * @param {string} role - Current user role
 * @returns {string} - Resolved target URL
 */
export const resolveNotificationRoute = (link, type, role) => {
  if (type === 'new_message' || link?.includes('chat')) {
    return link || '/chat';
  }
  if (type === 'job_alert' || link?.includes('external-jobs')) {
    return '/external-jobs';
  }
  if (!link) return getRoleDashboardRoute(role);

  if (role === 'student') {
    if (link.includes('application')) return '/my-applications';
    if (link.includes('task')) return '/my-tasks';
    if (link.includes('attendance')) return '/my-attendance';
    if (link.includes('internship') || link.includes('opportunit')) return '/internships';
    if (link.includes('certificate')) return '/certificates';
    if (link.includes('evaluation')) return '/evaluations';
  } else {
    if (link.includes('application')) return '/manage/applications';
    if (link.includes('task')) return '/manage/tasks';
    if (link.includes('attendance')) return '/manage/attendance';
    if (link.includes('allocation')) return '/manage/allocations';
    if (link.includes('internship') || link.includes('opportunit')) return '/manage/internships';
    if (link.includes('user')) return '/admin/users';
    if (link.includes('certificate')) return '/certificates';
    if (link.includes('evaluation')) return '/evaluations';
  }

  return link;
};

export default {
  getRoleDashboardRoute,
  resolveNotificationRoute,
};

