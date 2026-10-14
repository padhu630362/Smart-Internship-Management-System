import path from 'path';
import fs from 'fs';
import { Internship, WORK_MODES, INTERNSHIP_STATUSES } from '../models/Internship.js';
import { ROLES, User } from '../models/User.js';
import {
  createAndDispatchBulkNotifications,
  NOTIFICATION_TYPES,
} from '../services/notificationService.js';
import { escapeRegex } from '../middlewares/sanitize.js';
import { extractResumeText, analyzeResumeWithGemini } from '../services/aiService.js';
import { UPLOAD_DIR } from '../utils/fileUpload.js';

/**
 * Public & Student directory of published internship opportunities.
 */
export const getPublicInternships = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 9));
    const skip = (page - 1) * limit;

    // Students can ONLY view published opportunities
    const query = {
      status: INTERNSHIP_STATUSES.PUBLISHED,
    };

    // Filter by work mode
    if (req.query.workMode && req.query.workMode !== 'all') {
      query.workMode = req.query.workMode;
    }

    // Filter by stipend
    if (req.query.hasStipend === 'true') {
      query['stipend.hasStipend'] = true;
      query['stipend.amount'] = { $gt: 0 };
    }

    if (req.query.minStipend) {
      query['stipend.amount'] = { $gte: Number(req.query.minStipend) };
    }

    // Filter by required skills
    if (req.query.skill) {
      const skillsArray = req.query.skill.split(',').map((s) => s.trim());
      query.requiredSkills = { $in: skillsArray.map((s) => new RegExp(escapeRegex(s), 'i')) };
    }

    // Full-text / Regex search
    const searchTerm = req.query.search || req.query.q;
    if (searchTerm && searchTerm.trim()) {
      const safeTerm = escapeRegex(searchTerm.trim());
      const regex = new RegExp(safeTerm, 'i');
      query.$or = [
        { title: regex },
        { description: regex },
        { companyName: regex },
        { location: regex },
        { requiredSkills: regex },
      ];
    }

    // Sorting
    let sort = { createdAt: -1 };
    if (req.query.sortBy === 'deadline') {
      sort = { applicationDeadline: 1 };
    } else if (req.query.sortBy === 'stipend') {
      sort = { 'stipend.amount': -1 };
    } else if (req.query.sortBy === 'oldest') {
      sort = { createdAt: 1 };
    }

    const [opportunities, total] = await Promise.all([
      Internship.find(query)
        .populate('company', 'name email profile.companyDetails')
        .populate('mentor', 'name email profile.mentorDetails')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Internship.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        opportunities,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieve single internship opportunity with detail views.
 */
export const getInternshipById = async (req, res, next) => {
  try {
    const opportunity = await Internship.findById(req.params.id)
      .populate('company', 'name email profile.companyDetails')
      .populate('mentor', 'name email profile.mentorDetails');

    if (!opportunity) {
      const error = new Error('Internship opportunity not found.');
      error.statusCode = 404;
      error.code = 'OPPORTUNITY_NOT_FOUND';
      return next(error);
    }

    // If opportunity is not published, verify requester authorization
    if (opportunity.status !== INTERNSHIP_STATUSES.PUBLISHED) {
      if (!req.user) {
        const error = new Error('This internship opportunity is not currently available for public view.');
        error.statusCode = 403;
        error.code = 'OPPORTUNITY_NOT_PUBLISHED';
        return next(error);
      }

      const isPrivileged = req.user.role === ROLES.ADMIN || req.user.role === ROLES.COORDINATOR;
      const isOwner = opportunity.company.toString() === req.user.id || opportunity.createdBy.toString() === req.user.id;

      if (!isPrivileged && !isOwner) {
        const error = new Error('You do not have permission to view this unpublished opportunity.');
        error.statusCode = 403;
        error.code = 'OPPORTUNITY_NOT_PUBLISHED';
        return next(error);
      }
    }

    res.status(200).json({
      success: true,
      data: { opportunity },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Management console endpoint: retrieve opportunities for company or institutional oversight.
 */
export const getCompanyInternships = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const query = {};

    // Company boundary: companies can only see their own opportunities
    const userRole = req.user.role;
    if (userRole === ROLES.COMPANY || userRole === ROLES.MENTOR) {
      query.company = req.user.id;
    } else if ((userRole === ROLES.ADMIN || userRole === ROLES.COORDINATOR) && req.query.companyId) {
      query.company = req.query.companyId;
    }

    // Status filter
    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    // Search query
    const searchTerm = req.query.search || req.query.q;
    if (searchTerm && searchTerm.trim()) {
      const safeTerm = escapeRegex(searchTerm.trim());
      const regex = new RegExp(safeTerm, 'i');
      query.$or = [
        { title: regex },
        { description: regex },
        { location: regex },
        { requiredSkills: regex },
      ];
    }

    // Stats aggregation matching company context
    const statsQuery = (userRole === ROLES.COMPANY || userRole === ROLES.MENTOR)
      ? { company: req.user._id }
      : {};

    const [opportunities, total, stats] = await Promise.all([
      Internship.find(query)
        .populate('company', 'name email profile.companyDetails')
        .populate('mentor', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Internship.countDocuments(query),
      Internship.aggregate([
        { $match: statsQuery },
        {
          $group: {
            _id: null,
            totalCount: { $sum: 1 },
            publishedCount: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } },
            draftCount: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
            closedCount: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
            archivedCount: { $sum: { $cond: [{ $eq: ['$status', 'archived'] }, 1, 0] } },
            totalOpenings: { $sum: '$openings' },
          },
        },
      ]),
    ]);

    const aggregateStats = stats[0] || {
      totalCount: 0,
      publishedCount: 0,
      draftCount: 0,
      closedCount: 0,
      archivedCount: 0,
      totalOpenings: 0,
    };

    res.status(200).json({
      success: true,
      data: {
        opportunities,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
        stats: aggregateStats,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Creates a new internship opportunity.
 */
export const createInternship = async (req, res, next) => {
  try {
    const {
      title,
      description,
      requiredSkills,
      eligibility,
      location,
      workMode,
      stipend,
      duration,
      openings,
      startDate,
      applicationStartDate,
      applicationDeadline,
      status,
      mentor,
      companyId,
      companyName: manualCompanyName,
    } = req.body;

    const user = req.user;
    let targetCompanyId = user.id;
    let targetCompanyName = user.profile?.companyDetails?.companyName || user.name;

    // Admins and coordinators can provision internships on behalf of any company
    if ((user.role === ROLES.ADMIN || user.role === ROLES.COORDINATOR) && companyId) {
      targetCompanyId = companyId;
      const targetCompany = await User.findById(companyId);
      if (targetCompany) {
        targetCompanyName =
          targetCompany.profile?.companyDetails?.companyName || targetCompany.name;
      }
    }

    if (manualCompanyName && manualCompanyName.trim()) {
      targetCompanyName = manualCompanyName.trim();
    }

    const newOpportunity = await Internship.create({
      title: title.trim(),
      description: description.trim(),
      company: targetCompanyId,
      companyName: targetCompanyName,
      mentor: mentor || undefined,
      requiredSkills: Array.isArray(requiredSkills)
        ? requiredSkills.map((s) => s.trim()).filter(Boolean)
        : [],
      eligibility: {
        minCgpa: eligibility?.minCgpa !== undefined ? Number(eligibility.minCgpa) : 0,
        allowedDepartments: Array.isArray(eligibility?.allowedDepartments)
          ? eligibility.allowedDepartments.map((d) => d.trim()).filter(Boolean)
          : [],
        allowedGraduationYears: Array.isArray(eligibility?.allowedGraduationYears)
          ? eligibility.allowedGraduationYears.map(Number).filter(Boolean)
          : [],
        otherRequirements: eligibility?.otherRequirements || '',
      },
      location: location?.trim() || 'Flexible / Multiple Locations',
      workMode: workMode || WORK_MODES.ONSITE,
      stipend: {
        hasStipend: stipend?.hasStipend ?? true,
        amount: stipend?.amount !== undefined ? Number(stipend.amount) : 0,
        currency: stipend?.currency?.trim() || 'USD',
        periodicity: stipend?.periodicity || 'monthly',
      },
      duration: duration?.trim() || '3 Months',
      openings: Number(openings) || 1,
      startDate: startDate ? new Date(startDate) : undefined,
      applicationStartDate: applicationStartDate ? new Date(applicationStartDate) : new Date(),
      applicationDeadline: new Date(applicationDeadline),
      status: status || INTERNSHIP_STATUSES.DRAFT,
      createdBy: user.id,
    });

    if (newOpportunity.status === INTERNSHIP_STATUSES.PUBLISHED) {
      User.find({ role: ROLES.STUDENT, status: 'active' })
        .select('_id')
        .lean()
        .then((students) => {
          if (students && students.length > 0) {
            createAndDispatchBulkNotifications(
              students.map((s) => s._id),
              {
                senderId: user.id,
                type: NOTIFICATION_TYPES.OPPORTUNITY_PUBLISHED,
                title: 'New Internship Opportunity',
                message: `"${newOpportunity.title}" at ${newOpportunity.companyName} is now accepting applications.`,
                link: '/opportunities',
                metadata: { internshipId: newOpportunity._id },
              }
            );
          }
        })
        .catch(() => {});
    }

    res.status(201).json({
      success: true,
      message: `Internship opportunity '${newOpportunity.title}' created successfully.`,
      data: { opportunity: newOpportunity },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Updates an existing internship opportunity.
 */
export const updateInternship = async (req, res, next) => {
  try {
    const opportunity = req.opportunity; // Attached by checkOpportunityOwnership
    const {
      title,
      description,
      requiredSkills,
      eligibility,
      location,
      workMode,
      stipend,
      duration,
      openings,
      startDate,
      applicationStartDate,
      applicationDeadline,
      status,
      mentor,
      companyName,
    } = req.body;

    if (title) opportunity.title = title.trim();
    if (description) opportunity.description = description.trim();
    if (companyName && (req.user.role === ROLES.ADMIN || req.user.role === ROLES.COORDINATOR)) {
      opportunity.companyName = companyName.trim();
    }

    if (requiredSkills && Array.isArray(requiredSkills)) {
      opportunity.requiredSkills = requiredSkills.map((s) => s.trim()).filter(Boolean);
    }

    if (eligibility) {
      opportunity.eligibility = {
        minCgpa: eligibility.minCgpa !== undefined ? Number(eligibility.minCgpa) : opportunity.eligibility?.minCgpa || 0,
        allowedDepartments: Array.isArray(eligibility.allowedDepartments)
          ? eligibility.allowedDepartments.map((d) => d.trim()).filter(Boolean)
          : opportunity.eligibility?.allowedDepartments || [],
        allowedGraduationYears: Array.isArray(eligibility.allowedGraduationYears)
          ? eligibility.allowedGraduationYears.map(Number).filter(Boolean)
          : opportunity.eligibility?.allowedGraduationYears || [],
        otherRequirements: eligibility.otherRequirements !== undefined
          ? eligibility.otherRequirements
          : opportunity.eligibility?.otherRequirements || '',
      };
    }

    if (location !== undefined) opportunity.location = location.trim();
    if (workMode) opportunity.workMode = workMode;

    if (stipend) {
      opportunity.stipend = {
        hasStipend: stipend.hasStipend ?? opportunity.stipend?.hasStipend ?? true,
        amount: stipend.amount !== undefined ? Number(stipend.amount) : opportunity.stipend?.amount || 0,
        currency: stipend.currency || opportunity.stipend?.currency || 'USD',
        periodicity: stipend.periodicity || opportunity.stipend?.periodicity || 'monthly',
      };
    }

    if (duration !== undefined) opportunity.duration = duration.trim();
    if (openings !== undefined) opportunity.openings = Number(openings);
    if (startDate !== undefined) opportunity.startDate = startDate ? new Date(startDate) : undefined;
    if (applicationStartDate !== undefined) opportunity.applicationStartDate = new Date(applicationStartDate);
    if (applicationDeadline !== undefined) opportunity.applicationDeadline = new Date(applicationDeadline);
    if (status) opportunity.status = status;
    if (mentor !== undefined) opportunity.mentor = mentor || undefined;

    await opportunity.save();

    res.status(200).json({
      success: true,
      message: 'Internship opportunity updated successfully.',
      data: { opportunity },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Fast status transition (e.g. publish, close, archive).
 */
export const updateInternshipStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !Object.values(INTERNSHIP_STATUSES).includes(status)) {
      const error = new Error(`Valid status required: ${Object.values(INTERNSHIP_STATUSES).join(', ')}`);
      error.statusCode = 400;
      error.code = 'INVALID_STATUS';
      return next(error);
    }

    const opportunity = req.opportunity;
    const wasPublished = opportunity.status === INTERNSHIP_STATUSES.PUBLISHED;
    opportunity.status = status;
    await opportunity.save();

    if (status === INTERNSHIP_STATUSES.PUBLISHED && !wasPublished) {
      User.find({ role: ROLES.STUDENT, status: 'active' })
        .select('_id')
        .lean()
        .then((students) => {
          if (students && students.length > 0) {
            createAndDispatchBulkNotifications(
              students.map((s) => s._id),
              {
                senderId: req.user.id,
                type: NOTIFICATION_TYPES.OPPORTUNITY_PUBLISHED,
                title: 'New Internship Opportunity',
                message: `"${opportunity.title}" at ${opportunity.companyName} is now accepting applications.`,
                link: '/opportunities',
                metadata: { internshipId: opportunity._id },
              }
            );
          }
        })
        .catch(() => {});
    }

    res.status(200).json({
      success: true,
      message: `Internship status changed to '${status}'.`,
      data: { opportunity },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Deletes an internship opportunity.
 */
export const deleteInternship = async (req, res, next) => {
  try {
    await Internship.findByIdAndDelete(req.opportunity._id);

    res.status(200).json({
      success: true,
      message: 'Internship opportunity deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Calculates live AI / deterministic match score between current user and an internship.
 */
export const getInternshipMatchScore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const internship = await Internship.findById(id);
    if (!internship) {
      const error = new Error('Internship not found.');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      return next(error);
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      return next(error);
    }

    const studentSnapshot = {
      name: user.name,
      department: user.profile?.studentDetails?.department || '',
      cgpa: user.profile?.studentDetails?.cgpa || null,
      skills: user.profile?.studentDetails?.skills || [],
      bio: user.profile?.bio || '',
    };

    let resumeText = '';
    const resumeFilename = user.profile?.studentDetails?.resumeUrl?.split('/').pop();
    if (resumeFilename) {
      const filePath = path.join(UPLOAD_DIR, resumeFilename);
      if (fs.existsSync(filePath)) {
        resumeText = await extractResumeText(filePath);
      }
    }

    const matchResult = await analyzeResumeWithGemini({
      resumeText,
      studentProfile: studentSnapshot,
      internship,
    });

    res.status(200).json({
      success: true,
      data: {
        matchScore: matchResult.matchScore,
        matchedSkills: matchResult.matchedSkills,
        missingSkills: matchResult.missingSkills,
        strengths: matchResult.strengths,
        improvements: matchResult.improvements,
        overallAssessment: matchResult.overallAssessment,
        engine: matchResult.engine,
      },
    });
  } catch (err) {
    next(err);
  }
};

