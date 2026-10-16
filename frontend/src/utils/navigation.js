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

export default {
  getRoleDashboardRoute,
};

