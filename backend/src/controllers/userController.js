import path from 'path';
import fs from 'fs';
import { User, ROLES, USER_STATUSES } from '../models/User.js';
import { hashPassword } from '../utils/security.js';
import { UPLOAD_DIR } from '../utils/fileUpload.js';
import { logger } from '../utils/logger.js';
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
    if (name) user.name = String(name).trim();
    if (!user.profile) user.profile = {};

    if (phone !== undefined) user.profile.phone = String(phone || '').trim();
    if (bio !== undefined) user.profile.bio = String(bio || '').trim();
    if (avatarUrl !== undefined) user.profile.avatarUrl = String(avatarUrl || '').trim();
    if (department !== undefined) user.profile.department = String(department || '').trim();

    // Role-specific subdocument updates
    if (user.role === ROLES.STUDENT && studentDetails) {
      if (!user.profile.studentDetails) user.profile.studentDetails = {};
      const sd = user.profile.studentDetails;
      if (studentDetails.studentId !== undefined) sd.studentId = String(studentDetails.studentId || '').trim();
      if (studentDetails.department !== undefined) sd.department = String(studentDetails.department || '').trim();
      if (studentDetails.course !== undefined) sd.course = String(studentDetails.course || '').trim();
      if (studentDetails.university !== undefined) sd.university = String(studentDetails.university || '').trim();
      if (studentDetails.institution !== undefined) sd.institution = String(studentDetails.institution || '').trim();
      if (studentDetails.graduationYear !== undefined && studentDetails.graduationYear !== '' && studentDetails.graduationYear !== null) {
        const yr = Number(studentDetails.graduationYear);
        if (!isNaN(yr) && yr >= 2000 && yr <= 2100) {
          sd.graduationYear = yr;
        }
      }
      if (studentDetails.cgpa !== undefined && studentDetails.cgpa !== '' && studentDetails.cgpa !== null) {
        const gpa = Number(studentDetails.cgpa);
        if (!isNaN(gpa) && gpa >= 0 && gpa <= 10) {
          sd.cgpa = gpa;
        }
      }
      if (Array.isArray(studentDetails.skills)) {
        sd.skills = studentDetails.skills.map((s) => String(s || '').trim()).filter(Boolean);
      }
      if (studentDetails.linkedinUrl !== undefined) sd.linkedinUrl = String(studentDetails.linkedinUrl || '').trim();
      if (studentDetails.githubUrl !== undefined) sd.githubUrl = String(studentDetails.githubUrl || '').trim();
      if (studentDetails.portfolioUrl !== undefined) sd.portfolioUrl = String(studentDetails.portfolioUrl || '').trim();
    } else if (user.role === ROLES.COMPANY && companyDetails) {
      if (!user.profile.companyDetails) user.profile.companyDetails = {};
      const cd = user.profile.companyDetails;
      if (companyDetails.companyName !== undefined) cd.companyName = String(companyDetails.companyName || '').trim();
      if (companyDetails.industry !== undefined) cd.industry = String(companyDetails.industry || '').trim();
      if (companyDetails.website !== undefined) cd.website = String(companyDetails.website || '').trim();
      if (companyDetails.description !== undefined) cd.description = String(companyDetails.description || '').trim();
      if (companyDetails.address !== undefined) cd.address = String(companyDetails.address || '').trim();
      if (companyDetails.contactEmail !== undefined) cd.contactEmail = String(companyDetails.contactEmail || '').trim();
      if (companyDetails.contactPhone !== undefined) cd.contactPhone = String(companyDetails.contactPhone || '').trim();
    } else if (user.role === ROLES.MENTOR && mentorDetails) {
      if (!user.profile.mentorDetails) user.profile.mentorDetails = {};
      const md = user.profile.mentorDetails;
      if (mentorDetails.companyName !== undefined) md.companyName = String(mentorDetails.companyName || '').trim();
      if (mentorDetails.designation !== undefined) md.designation = String(mentorDetails.designation || '').trim();
      if (mentorDetails.yearsOfExperience !== undefined && mentorDetails.yearsOfExperience !== '' && mentorDetails.yearsOfExperience !== null) {
        const yoe = Number(mentorDetails.yearsOfExperience);
        if (!isNaN(yoe) && yoe >= 0 && yoe <= 60) {
          md.yearsOfExperience = yoe;
        }
      }
      if (Array.isArray(mentorDetails.expertise)) {
        md.expertise = mentorDetails.expertise.map((e) => String(e || '').trim()).filter(Boolean);
      }
      if (mentorDetails.linkedinUrl !== undefined) md.linkedinUrl = String(mentorDetails.linkedinUrl || '').trim();
    } else if (user.role === ROLES.COORDINATOR && coordinatorDetails) {
      if (!user.profile.coordinatorDetails) user.profile.coordinatorDetails = {};
      const coord = user.profile.coordinatorDetails;
      if (coordinatorDetails.institution !== undefined) coord.institution = String(coordinatorDetails.institution || '').trim();
      if (coordinatorDetails.facultyId !== undefined) coord.facultyId = String(coordinatorDetails.facultyId || '').trim();
      if (coordinatorDetails.department !== undefined) coord.department = String(coordinatorDetails.department || '').trim();
      if (coordinatorDetails.designation !== undefined) coord.designation = String(coordinatorDetails.designation || '').trim();
      if (coordinatorDetails.officeLocation !== undefined) coord.officeLocation = String(coordinatorDetails.officeLocation || '').trim();
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
    const ext = path.extname(safeFilename).toLowerCase();
    const mimeMap = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    const mimeType = mimeMap[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);

    const downloadName = (req.user.role === ROLES.STUDENT ? req.user.profile?.studentDetails?.resumeFileName : null) || safeFilename;

    if (req.query.download === 'true' || req.query.dl === '1') {
      res.download(filePath, downloadName);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${downloadName}"`);
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    }
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
            mentors: { $sum: { $cond: [{ $eq: ['$role', 'mentor'] }, 1, 0] } },
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
      mentors: 0,
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

    // Safety guard: cannot delete designated primary administrators (Padmavathi & Arshad)
    const DESIGNATED_ADMIN_EMAILS = ['s.v.padmavathi2005@gmail.com', 'arshadtaiyab010@gmail.com'];
    if (DESIGNATED_ADMIN_EMAILS.includes(targetUser.email.toLowerCase())) {
      const error = new Error('Action prohibited: Designated primary administrators cannot be deleted.');
      error.statusCode = 403;
      error.code = 'DESIGNATED_ADMIN_PROTECTED';
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

    res.status(200).json({
      success: true,
      message: 'User deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};
