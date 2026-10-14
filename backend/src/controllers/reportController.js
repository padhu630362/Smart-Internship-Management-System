import mongoose from 'mongoose';
import { User, ROLES } from '../models/User.js';
import { Internship } from '../models/Internship.js';
import { Application } from '../models/Application.js';
import { Allocation } from '../models/Allocation.js';
import { Attendance } from '../models/Attendance.js';
import { Evaluation } from '../models/Evaluation.js';

/**
 * Sanitizes a string for CSV to prevent Formula Injection (CSV Injection)
 * and properly escape quotes and commas.
 */
const escapeCSV = (value) => {
  if (value === null || value === undefined) return '""';
  let stringVal = String(value).trim();

  // Prevent formula injection in Excel/Sheets (=, +, -, @, \t, \r)
  if (/^[=+\-@\t\r]/.test(stringVal)) {
    stringVal = `'${stringVal}`;
  }

  // Escape inner double quotes by doubling them
  stringVal = stringVal.replace(/"/g, '""');
  return `"${stringVal}"`;
};

/**
 * Build authorized filter query for report types
 */
const buildReportFilter = async (user, queryParams) => {
  const { type = 'applications', startDate, endDate, department, company, internship, status } =
    queryParams;
  const userRole = user.role;
  const userId = user.id;

  const filter = {};

  // Date range filter
  if (startDate || endDate) {
    const dateField = type === 'attendance' ? 'date' : type === 'allocations' ? 'startDate' : 'createdAt';
    filter[dateField] = {};
    if (startDate) {
      const sDate = new Date(startDate);
      if (!isNaN(sDate.getTime())) filter[dateField].$gte = sDate;
    }
    if (endDate) {
      const eDate = new Date(endDate);
      if (!isNaN(eDate.getTime())) {
        eDate.setHours(23, 59, 59, 999);
        filter[dateField].$lte = eDate;
      }
    }
    if (Object.keys(filter[dateField]).length === 0) delete filter[dateField];
  }

  // Status filter
  if (status && status !== 'all') {
    filter.status = status;
  }

  // Company scope enforcement
  if (userRole === ROLES.COMPANY) {
    if (type === 'internships') {
      filter.company = userId;
    } else if (['applications', 'allocations'].includes(type)) {
      filter.company = userId;
    }
  } else if (company && mongoose.Types.ObjectId.isValid(company)) {
    filter.company = company;
  }

  // Mentor scope enforcement
  if (userRole === ROLES.MENTOR && ['allocations', 'evaluations'].includes(type)) {
    filter.mentor = userId;
  }

  // Internship filter
  if (internship && mongoose.Types.ObjectId.isValid(internship)) {
    filter.internship = internship;
  }

  // Department filter (students belonging to department)
  if (department && department !== 'all') {
    const studentIds = await User.find({
      role: ROLES.STUDENT,
      'profile.studentDetails.department': department,
    }).distinct('_id');

    if (type === 'applications' || type === 'allocations' || type === 'attendance' || type === 'evaluations') {
      filter.student = { $in: studentIds };
    }
  }

  return filter;
};

/**
 * Retrieve filtered report data with summary statistics
 */
export const getReportData = async (req, res, next) => {
  try {
    const userRole = req.user.role;

    // Strict Permission: Students cannot view institutional reports
    if (userRole === ROLES.STUDENT) {
      const error = new Error('Access denied: You are not authorized to access institutional reports.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN_REPORT_ACCESS';
      return next(error);
    }

    const { type = 'applications', page = 1, limit = 50 } = req.query;
    const filter = await buildReportFilter(req.user, req.query);

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    let records = [];
    let total = 0;
    let summary = {};

    if (type === 'applications') {
      [records, total] = await Promise.all([
        Application.find(filter)
          .populate('student', 'name email profile')
          .populate('internship', 'title companyName location workMode')
          .populate('company', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Application.countDocuments(filter),
      ]);

      summary = {
        totalApplications: total,
        selectedCount: await Application.countDocuments({ ...filter, status: 'selected' }),
        underReviewCount: await Application.countDocuments({ ...filter, status: 'under_review' }),
      };
    } else if (type === 'allocations') {
      [records, total] = await Promise.all([
        Allocation.find(filter)
          .populate('student', 'name email profile')
          .populate('internship', 'title location')
          .populate('company', 'name')
          .populate('mentor', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Allocation.countDocuments(filter),
      ]);

      summary = {
        totalAllocations: total,
        activeCount: await Allocation.countDocuments({ ...filter, status: 'active' }),
        completedCount: await Allocation.countDocuments({ ...filter, status: 'completed' }),
      };
    } else if (type === 'internships') {
      [records, total] = await Promise.all([
        Internship.find(filter)
          .populate('company', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Internship.countDocuments(filter),
      ]);

      summary = {
        totalOpportunities: total,
        publishedCount: await Internship.countDocuments({ ...filter, status: 'published' }),
      };
    } else if (type === 'evaluations') {
      [records, total] = await Promise.all([
        Evaluation.find(filter)
          .populate('student', 'name email profile')
          .populate('evaluator', 'name role')
          .populate('internship', 'title')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Evaluation.countDocuments(filter),
      ]);

      const avgAgg = await Evaluation.aggregate([
        { $match: filter },
        { $group: { _id: null, avgScore: { $avg: '$ratings.overallRating' } } },
      ]);

      summary = {
        totalEvaluations: total,
        averageOverallRating: Math.round((avgAgg[0]?.avgScore || 0) * 10) / 10,
      };
    }

    res.status(200).json({
      success: true,
      data: {
        type,
        summary,
        records,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Generate and stream sanitized CSV export file
 */
export const exportReportCSV = async (req, res, next) => {
  try {
    const userRole = req.user.role;

    if (userRole === ROLES.STUDENT) {
      const error = new Error('Access denied: You are not authorized to export institutional reports.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN_REPORT_EXPORT';
      return next(error);
    }

    const { type = 'applications' } = req.query;
    const filter = await buildReportFilter(req.user, req.query);

    let headers = [];
    let rows = [];

    if (type === 'applications') {
      headers = [
        'Application ID',
        'Student Name',
        'Student Email',
        'Department',
        'Internship Title',
        'Company Name',
        'Status',
        'Applied Date',
      ];

      const records = await Application.find(filter)
        .populate('student', 'name email profile')
        .populate('internship', 'title companyName')
        .sort({ createdAt: -1 })
        .limit(2000)
        .lean();

      rows = records.map((r) => [
        r._id.toString(),
        r.student?.name || 'N/A',
        r.student?.email || 'N/A',
        r.student?.profile?.studentDetails?.department || 'N/A',
        r.internship?.title || 'N/A',
        r.internship?.companyName || 'N/A',
        r.status || 'submitted',
        r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : 'N/A',
      ]);
    } else if (type === 'allocations') {
      headers = [
        'Allocation ID',
        'Student Name',
        'Student Email',
        'Department',
        'Internship Title',
        'Company Name',
        'Mentor Name',
        'Start Date',
        'End Date',
        'Status',
      ];

      const records = await Allocation.find(filter)
        .populate('student', 'name email profile')
        .populate('internship', 'title')
        .populate('company', 'name')
        .populate('mentor', 'name')
        .sort({ createdAt: -1 })
        .limit(2000)
        .lean();

      rows = records.map((r) => [
        r._id.toString(),
        r.student?.name || 'N/A',
        r.student?.email || 'N/A',
        r.student?.profile?.studentDetails?.department || 'N/A',
        r.internship?.title || 'N/A',
        r.company?.name || 'N/A',
        r.mentor?.name || 'Unassigned',
        r.startDate ? new Date(r.startDate).toISOString().split('T')[0] : 'N/A',
        r.endDate ? new Date(r.endDate).toISOString().split('T')[0] : 'N/A',
        r.status || 'active',
      ]);
    } else if (type === 'evaluations') {
      headers = [
        'Evaluation ID',
        'Student Name',
        'Department',
        'Evaluator Name',
        'Evaluator Role',
        'Internship Title',
        'Evaluation Type',
        'Technical Skills (1-5)',
        'Communication (1-5)',
        'Punctuality (1-5)',
        'Overall Rating',
        'Recommendation',
        'Passed',
        'Date Submitted',
      ];

      const records = await Evaluation.find(filter)
        .populate('student', 'name profile')
        .populate('evaluator', 'name role')
        .populate('internship', 'title')
        .sort({ createdAt: -1 })
        .limit(2000)
        .lean();

      rows = records.map((r) => [
        r._id.toString(),
        r.student?.name || 'N/A',
        r.student?.profile?.studentDetails?.department || 'N/A',
        r.evaluator?.name || 'N/A',
        r.evaluator?.role || 'N/A',
        r.internship?.title || 'N/A',
        r.evaluationType || 'mid_term',
        r.ratings?.technicalSkills || 0,
        r.ratings?.communication || 0,
        r.ratings?.punctualityAndAttendance || 0,
        r.ratings?.overallRating || 0,
        r.recommendation || 'recommended',
        r.isPassed ? 'Yes' : 'No',
        r.submittedAt ? new Date(r.submittedAt).toISOString().split('T')[0] : 'N/A',
      ]);
    } else {
      // Default: Internships
      headers = [
        'Opportunity ID',
        'Title',
        'Company Name',
        'Location',
        'Work Mode',
        'Duration',
        'Openings',
        'Status',
        'Deadline',
      ];

      const records = await Internship.find(filter)
        .sort({ createdAt: -1 })
        .limit(2000)
        .lean();

      rows = records.map((r) => [
        r._id.toString(),
        r.title || 'N/A',
        r.companyName || 'N/A',
        r.location || 'N/A',
        r.workMode || 'N/A',
        r.duration || 'N/A',
        r.openings || 0,
        r.status || 'draft',
        r.applicationDeadline ? new Date(r.applicationDeadline).toISOString().split('T')[0] : 'N/A',
      ]);
    }

    // Assemble CSV buffer with UTF-8 BOM for Microsoft Excel compatibility
    const headerLine = headers.map(escapeCSV).join(',');
    const dataLines = rows.map((row) => row.map(escapeCSV).join(','));
    const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\r\n');

    const fileName = `sims-${type}-report-${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
};
