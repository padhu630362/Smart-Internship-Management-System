import path from 'path';
import fs from 'fs';
import { User, ROLES, USER_STATUSES } from '../models/User.js';
import { hashPassword } from '../utils/security.js';
import { UPLOAD_DIR } from '../utils/fileUpload.js';
import { logger } from '../utils/logger.js';
import { recordAuditLog } from '../services/auditService.js';
import { escapeRegex } from '../middlewares/sanitize.js';

/**
 * Retrieves authenticated user's profile.
 */
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      return next(error);
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Updates authenticated user's permitted profile fields.
 */
export const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      return next(error);
    }

    const {
      name,
      phone,
      bio,
      avatarUrl,
      department,
      studentDetails,
      companyDetails,
      mentorDetails,
      coordinatorDetails,
    } = req.body;

    // Top-level allowable fields
    if (name) user.name = name.trim();
    if (!user.profile) user.profile = {};

    if (phone !== undefined) user.profile.phone = phone.trim();
    if (bio !== undefined) user.profile.bio = bio.trim();
    if (avatarUrl !== undefined) user.profile.avatarUrl = avatarUrl.trim();
    if (department !== undefined) user.profile.department = department.trim();

    // Role-specific subdocument updates
    if (user.role === ROLES.STUDENT && studentDetails) {
      user.profile.studentDetails = {
        ...user.profile.studentDetails,
        ...(studentDetails.studentId !== undefined && { studentId: studentDetails.studentId.trim() }),
        ...(studentDetails.department !== undefined && { department: studentDetails.department.trim() }),
        ...(studentDetails.course !== undefined && { course: studentDetails.course.trim() }),
        ...(studentDetails.graduationYear !== undefined && { graduationYear: Number(studentDetails.graduationYear) }),
        ...(studentDetails.cgpa !== undefined && { cgpa: Number(studentDetails.cgpa) }),
        ...(studentDetails.skills !== undefined && {
          skills: studentDetails.skills.map((s) => s.trim()).filter(Boolean),
        }),
        ...(studentDetails.linkedinUrl !== undefined && { linkedinUrl: studentDetails.linkedinUrl.trim() }),
        ...(studentDetails.githubUrl !== undefined && { githubUrl: studentDetails.githubUrl.trim() }),
        ...(studentDetails.portfolioUrl !== undefined && { portfolioUrl: studentDetails.portfolioUrl.trim() }),
      };
    } else if (user.role === ROLES.COMPANY && companyDetails) {
      user.profile.companyDetails = {
        ...user.profile.companyDetails,
        ...(companyDetails.companyName !== undefined && { companyName: companyDetails.companyName.trim() }),
        ...(companyDetails.industry !== undefined && { industry: companyDetails.industry.trim() }),
        ...(companyDetails.website !== undefined && { website: companyDetails.website.trim() }),
        ...(companyDetails.description !== undefined && { description: companyDetails.description.trim() }),
        ...(companyDetails.address !== undefined && { address: companyDetails.address.trim() }),
        ...(companyDetails.contactEmail !== undefined && { contactEmail: companyDetails.contactEmail.trim() }),
        ...(companyDetails.contactPhone !== undefined && { contactPhone: companyDetails.contactPhone.trim() }),
      };
    } else if (user.role === ROLES.MENTOR && mentorDetails) {
      user.profile.mentorDetails = {
        ...user.profile.mentorDetails,
        ...(mentorDetails.companyName !== undefined && { companyName: mentorDetails.companyName.trim() }),
        ...(mentorDetails.designation !== undefined && { designation: mentorDetails.designation.trim() }),
        ...(mentorDetails.yearsOfExperience !== undefined && { yearsOfExperience: Number(mentorDetails.yearsOfExperience) }),
        ...(mentorDetails.expertise !== undefined && {
          expertise: mentorDetails.expertise.map((e) => e.trim()).filter(Boolean),
        }),
        ...(mentorDetails.linkedinUrl !== undefined && { linkedinUrl: mentorDetails.linkedinUrl.trim() }),
      };
    } else if (user.role === ROLES.COORDINATOR && coordinatorDetails) {
      user.profile.coordinatorDetails = {
        ...user.profile.coordinatorDetails,
        ...(coordinatorDetails.institution !== undefined && { institution: coordinatorDetails.institution.trim() }),
        ...(coordinatorDetails.facultyId !== undefined && { facultyId: coordinatorDetails.facultyId.trim() }),
        ...(coordinatorDetails.department !== undefined && { department: coordinatorDetails.department.trim() }),
        ...(coordinatorDetails.designation !== undefined && { designation: coordinatorDetails.designation.trim() }),
        ...(coordinatorDetails.officeLocation !== undefined && { officeLocation: coordinatorDetails.officeLocation.trim() }),
      };
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Uploads a student resume file and saves its reference to MongoDB.
 */
export const uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error('No resume file provided.');
      error.statusCode = 400;
      error.code = 'FILE_REQUIRED';
      return next(error);
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      return next(error);
    }

    // Clean up previous resume file if one exists
    const previousFileName = user.profile?.studentDetails?.resumeUrl?.split('/').pop();
    if (previousFileName) {
      const oldPath = path.join(UPLOAD_DIR, previousFileName);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (e) {
          logger.warn(`Could not delete previous resume: ${e.message}`);
        }
      }
    }

    if (!user.profile) user.profile = {};
    if (!user.profile.studentDetails) user.profile.studentDetails = {};

    user.profile.studentDetails.resumeUrl = `/api/users/profile/resume/${req.file.filename}`;
    user.profile.studentDetails.resumeFileName = req.file.originalname;
    user.profile.studentDetails.resumeUploadedAt = new Date();

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Resume uploaded successfully.',
      data: {
        resumeUrl: user.profile.studentDetails.resumeUrl,
        resumeFileName: user.profile.studentDetails.resumeFileName,
        resumeUploadedAt: user.profile.studentDetails.resumeUploadedAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Downloads or views an uploaded student resume.
 */
export const downloadResume = async (req, res, next) => {
  try {
    const { filename } = req.params;
    // Prevent directory traversal attacks
    const safeFilename = path.basename(filename);

    // Authorization guard: students can only access their own resume
    if (req.user.role === ROLES.STUDENT) {
      const ownResumeFilename = req.user.profile?.studentDetails?.resumeUrl?.split('/').pop();
      if (!ownResumeFilename || ownResumeFilename !== safeFilename) {
        const error = new Error('Access forbidden: You are not authorized to access another student\'s resume.');
        error.statusCode = 403;
        error.code = 'FORBIDDEN_RESUME_ACCESS';
        return next(error);
      }
    }

    const filePath = path.join(UPLOAD_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      const error = new Error('Resume file not found.');
      error.statusCode = 404;
      error.code = 'FILE_NOT_FOUND';
      return next(error);
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.download(filePath, safeFilename);
  } catch (err) {
    next(err);
  }
};

/**
 * Deletes student's resume reference and file.
 */
export const deleteResume = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      return next(error);
    }

    const currentFilename = user.profile?.studentDetails?.resumeUrl?.split('/').pop();
    if (currentFilename) {
      const oldPath = path.join(UPLOAD_DIR, currentFilename);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (e) {
          logger.warn(`Could not delete resume file: ${e.message}`);
        }
      }
    }

    if (user.profile?.studentDetails) {
      user.profile.studentDetails.resumeUrl = null;
      user.profile.studentDetails.resumeFileName = null;
      user.profile.studentDetails.resumeUploadedAt = null;
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Resume deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: List users with search, role/status filtering, and pagination.
 */
export const getUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const query = {};

    // Filter by role
    if (req.query.role && req.query.role !== 'all') {
      query.role = req.query.role;
    }

    // Filter by status
    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    // Search query on name, email, or studentId
    const searchTerm = req.query.search || req.query.q;
    if (searchTerm && searchTerm.trim()) {
      const sanitizedSearch = escapeRegex(searchTerm.trim());
      const regex = new RegExp(sanitizedSearch, 'i');
      query.$or = [
        { name: regex },
        { email: regex },
        { 'profile.studentDetails.studentId': regex },
        { 'profile.department': regex },
      ];
    }

    const sortField = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortOrder };

    const [users, total, stats] = await Promise.all([
      User.find(query).sort(sort).skip(skip).limit(limit),
      User.countDocuments(query),
      User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            activeUsers: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            students: { $sum: { $cond: [{ $eq: ['$role', 'student'] }, 1, 0] } },
            companies: { $sum: { $cond: [{ $eq: ['$role', 'company'] }, 1, 0] } },
            coordinators: { $sum: { $cond: [{ $eq: ['$role', 'coordinator'] }, 1, 0] } },
            admins: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const aggregates = stats[0] || {
      totalUsers: 0,
      activeUsers: 0,
      students: 0,
      companies: 0,
      coordinators: 0,
      admins: 0,
    };

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
        stats: aggregates,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Get single user by ID.
 */
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      return next(error);
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Create a new user with any authorized role and status.
 */
export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, status, profile } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      const error = new Error('An account with this email address already exists.');
      error.statusCode = 409;
      error.code = 'EMAIL_ALREADY_EXISTS';
      return next(error);
    }

    const passwordHash = await hashPassword(password);

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      status: status || USER_STATUSES.ACTIVE,
      profile: profile || {},
      createdBy: req.user.id,
    });

    // Record administrative audit log
    await recordAuditLog({
      action: 'USER_CREATED',
      req,
      targetUser: newUser._id,
      resourceType: 'User',
      details: { role: newUser.role, status: newUser.status, name: newUser.name, email: newUser.email },
    });

    res.status(201).json({
      success: true,
      message: `User created successfully with role '${role}'.`,
      data: { user: newUser },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Update user details, role, status, or reset password.
 */
export const updateUser = async (req, res, next) => {
  try {
    const targetUser = req.targetUser; // Attached by validateAdminUpdateUser
    const { name, email, role, status, password, profile } = req.body;

    const previousRole = targetUser.role;
    const previousStatus = targetUser.status;

    if (name) targetUser.name = name.trim();
    if (email && email.toLowerCase() !== targetUser.email) {
      const emailTaken = await User.findOne({ email: email.toLowerCase(), _id: { $ne: targetUser._id } });
      if (emailTaken) {
        const error = new Error('Email address is already in use by another account.');
        error.statusCode = 409;
        error.code = 'EMAIL_ALREADY_EXISTS';
        return next(error);
      }
      targetUser.email = email.toLowerCase().trim();
    }

    if (role) targetUser.role = role;
    if (status) targetUser.status = status;

    if (password && password.trim().length >= 8) {
      targetUser.passwordHash = await hashPassword(password.trim());
      targetUser.passwordChangedAt = new Date();
    }

    if (profile) {
      targetUser.profile = {
        ...targetUser.profile?.toObject(),
        ...profile,
      };
    }

    await targetUser.save();

    // Record audit logs for role and status changes
    if (role && role !== previousRole) {
      await recordAuditLog({
        action: 'USER_ROLE_CHANGED',
        req,
        targetUser: targetUser._id,
        resourceType: 'User',
        details: { previousRole, newRole: role, targetEmail: targetUser.email },
      });
    }

    if (status && status !== previousStatus) {
      await recordAuditLog({
        action: 'USER_STATUS_CHANGED',
        req,
        targetUser: targetUser._id,
        resourceType: 'User',
        details: { previousStatus, newStatus: status, targetEmail: targetUser.email },
      });
    }

    await recordAuditLog({
      action: 'USER_UPDATED',
      req,
      targetUser: targetUser._id,
      resourceType: 'User',
      details: { targetEmail: targetUser.email, updatedFields: Object.keys(req.body) },
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      data: { user: targetUser },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Quick status update (activate / deactivate / suspend).
 */
export const updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const targetUser = req.targetUser;
    const previousStatus = targetUser.status;

    targetUser.status = status;
    await targetUser.save();

    // Record status change audit log
    await recordAuditLog({
      action: 'USER_STATUS_CHANGED',
      req,
      targetUser: targetUser._id,
      resourceType: 'User',
      details: { previousStatus, newStatus: status, targetEmail: targetUser.email },
    });

    res.status(200).json({
      success: true,
      message: `User status changed to '${status}'.`,
      data: { user: targetUser },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Delete user with last active admin safety guard.
 */
export const deleteUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      return next(error);
    }

    // Safety guard: cannot delete last active administrator
    if (targetUser.role === ROLES.ADMIN && targetUser.status === USER_STATUSES.ACTIVE) {
      const canDelete = await User.canDemoteOrDeactivate(targetUserId);
      if (!canDelete) {
        const error = new Error(
          'Action prohibited: Cannot delete the last active administrator in the system.'
        );
        error.statusCode = 400;
        error.code = 'LAST_ADMIN_PROTECTED';
        return next(error);
      }
    }

    await User.findByIdAndDelete(targetUserId);

    // Record deletion audit log
    await recordAuditLog({
      action: 'USER_DELETED',
      req,
      targetUser: targetUserId,
      resourceType: 'User',
      details: { deletedEmail: targetUser.email, role: targetUser.role },
    });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};
