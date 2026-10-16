import { ROLES, USER_STATUSES, User } from '../models/User.js';

/**
 * Validates self-profile updates and restricts users strictly to authorized fields for their role.
 */
export const validateUpdateProfile = (req, res, next) => {
  const { name, phone, bio, avatarUrl, department, studentDetails, companyDetails, mentorDetails, coordinatorDetails, role, status, email } = req.body;

  // Prevent users from tampering with core security attributes
  if (role !== undefined || status !== undefined || email !== undefined) {
    const error = new Error('You cannot modify your email, role, or account status directly.');
    error.statusCode = 403;
    error.code = 'UNAUTHORIZED_FIELD_MODIFICATION';
    return next(error);
  }

  // Name validation if provided
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      const error = new Error('Name must be between 2 and 100 characters.');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      return next(error);
    }
  }

  // Role-based profile field restrictions
  const userRole = req.user.role;

  if (userRole === ROLES.STUDENT) {
    if (companyDetails || mentorDetails || coordinatorDetails) {
      const error = new Error('Students are not authorized to modify employer or faculty details.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN_PROFILE_FIELDS';
      return next(error);
    }

    if (studentDetails) {
      if (studentDetails.graduationYear !== undefined && studentDetails.graduationYear !== '' && studentDetails.graduationYear !== null) {
        const yr = Number(studentDetails.graduationYear);
        if (isNaN(yr) || yr < 2000 || yr > 2100) {
          const error = new Error('Graduation year must be between 2000 and 2100.');
          error.statusCode = 400;
          error.code = 'VALIDATION_ERROR';
          return next(error);
        }
      }
      if (studentDetails.cgpa !== undefined && studentDetails.cgpa !== '' && studentDetails.cgpa !== null) {
        const gpa = Number(studentDetails.cgpa);
        if (isNaN(gpa) || gpa < 0 || gpa > 10) {
          const error = new Error('CGPA must be between 0.0 and 10.0.');
          error.statusCode = 400;
          error.code = 'VALIDATION_ERROR';
          return next(error);
        }
      }
      if (studentDetails.skills !== undefined && !Array.isArray(studentDetails.skills)) {
        const error = new Error('Skills must be provided as an array.');
        error.statusCode = 400;
        error.code = 'VALIDATION_ERROR';
        return next(error);
      }
    }
  } else if (userRole === ROLES.COMPANY) {
    if (studentDetails || mentorDetails || coordinatorDetails) {
      const error = new Error('Company users can only update company details.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN_PROFILE_FIELDS';
      return next(error);
    }
  } else if (userRole === ROLES.MENTOR) {
    if (studentDetails || coordinatorDetails) {
      const error = new Error('Mentors can only update mentor details.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN_PROFILE_FIELDS';
      return next(error);
    }
  } else if (userRole === ROLES.COORDINATOR) {
    if (studentDetails || mentorDetails || companyDetails) {
      const error = new Error('Coordinators can only update institutional coordinator details.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN_PROFILE_FIELDS';
      return next(error);
    }
  }

  next();
};

/**
 * Validates user creation by an Administrator.
 */
export const validateAdminCreateUser = (req, res, next) => {
  const { name, email, password, role, status } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    const error = new Error('Full name is required (minimum 2 characters).');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    return next(error);
  }

  const normalizedEmail = typeof email === 'string' ? email.trim() : '';
  if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    const error = new Error('A valid email address is required.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    return next(error);
  }
  req.body.email = normalizedEmail;

  if (!password || password.length < 8) {
    const error = new Error('Password must be at least 8 characters long.');
    error.statusCode = 400;
    error.code = 'WEAK_PASSWORD';
    return next(error);
  }

  if (!role || !Object.values(ROLES).includes(role)) {
    const error = new Error(`Role must be one of: ${Object.values(ROLES).join(', ')}`);
    error.statusCode = 400;
    error.code = 'INVALID_ROLE';
    return next(error);
  }

  if (status && !Object.values(USER_STATUSES).includes(status)) {
    const error = new Error(`Status must be one of: ${Object.values(USER_STATUSES).join(', ')}`);
    error.statusCode = 400;
    error.code = 'INVALID_STATUS';
    return next(error);
  }

  next();
};

/**
 * Validates updates made by an Administrator to any user,
 * including protecting the last active administrator from accidental removal or demotion.
 */
export const validateAdminUpdateUser = async (req, res, next) => {
  const { role, status, email } = req.body;
  const targetUserId = req.params.id;

  if (role && !Object.values(ROLES).includes(role)) {
    const error = new Error(`Role must be one of: ${Object.values(ROLES).join(', ')}`);
    error.statusCode = 400;
    error.code = 'INVALID_ROLE';
    return next(error);
  }

  if (status && !Object.values(USER_STATUSES).includes(status)) {
    const error = new Error(`Status must be one of: ${Object.values(USER_STATUSES).join(', ')}`);
    error.statusCode = 400;
    error.code = 'INVALID_STATUS';
    return next(error);
  }

  if (email !== undefined) {
    const normalizedEmail = typeof email === 'string' ? email.trim() : '';
    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      const error = new Error('Invalid email address format.');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      return next(error);
    }
    req.body.email = normalizedEmail;
  }

  try {
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      return next(error);
    }

    const isCurrentlyActiveAdmin = targetUser.role === ROLES.ADMIN && targetUser.status === USER_STATUSES.ACTIVE;
    const willDemoteRole = role && role !== ROLES.ADMIN;
    const willDeactivateStatus = status && status !== USER_STATUSES.ACTIVE;

    // Protection for designated administrators (Padmavathi & Arshad) and the last active administrator:
    const DESIGNATED_ADMIN_EMAILS = ['s.v.padmavathi2005@gmail.com', 'arshadtaiyab010@gmail.com'];
    if (DESIGNATED_ADMIN_EMAILS.includes(targetUser.email.toLowerCase()) && (willDemoteRole || willDeactivateStatus)) {
      const error = new Error('Action prohibited: Designated primary administrators cannot be demoted or deactivated.');
      error.statusCode = 403;
      error.code = 'DESIGNATED_ADMIN_PROTECTED';
      return next(error);
    }

    if (isCurrentlyActiveAdmin && (willDemoteRole || willDeactivateStatus)) {
      const canDemote = await User.canDemoteOrDeactivate(targetUserId);
      if (!canDemote) {
        const error = new Error(
          'Action prohibited: Cannot demote or deactivate the last active administrator in the system.'
        );
        error.statusCode = 400;
        error.code = 'LAST_ADMIN_PROTECTED';
        return next(error);
      }
    }

    req.targetUser = targetUser;
    next();
  } catch (err) {
    next(err);
  }
};
