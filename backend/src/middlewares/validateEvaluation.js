import mongoose from 'mongoose';
import { Allocation } from '../models/Allocation.js';
import { Evaluation, EVALUATION_TYPES, EVALUATION_RECOMMENDATIONS } from '../models/Evaluation.js';
import { ROLES } from '../models/User.js';

export const validateCreateEvaluation = async (req, res, next) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;

    // Students cannot submit evaluations
    if (userRole === ROLES.STUDENT) {
      const error = new Error('Access denied: Students are not authorized to submit internship evaluations.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN_EVALUATION_SUBMISSION';
      return next(error);
    }

    const {
      allocationId,
      evaluationType,
      ratings,
      feedback,
      recommendation,
      isPassed,
    } = req.body;

    if (!allocationId || !mongoose.Types.ObjectId.isValid(allocationId)) {
      const error = new Error('A valid allocation ID is required.');
      error.statusCode = 400;
      error.code = 'INVALID_ALLOCATION_ID';
      return next(error);
    }

    if (!evaluationType || !Object.values(EVALUATION_TYPES).includes(evaluationType)) {
      const error = new Error('Valid evaluation type (mid_term or final) is required.');
      error.statusCode = 400;
      error.code = 'INVALID_EVALUATION_TYPE';
      return next(error);
    }

    // Verify allocation existence and permissions
    const allocation = await Allocation.findById(allocationId)
      .populate('internship', 'title company companyName')
      .populate('student', 'name email profile');

    if (!allocation) {
      const error = new Error('Internship allocation not found.');
      error.statusCode = 404;
      error.code = 'ALLOCATION_NOT_FOUND';
      return next(error);
    }

    // Mentor / Company role boundaries check
    if (userRole === ROLES.MENTOR) {
      const isAssignedMentor = allocation.mentor?.toString() === userId;
      if (!isAssignedMentor) {
        const error = new Error('Access denied: You are not the assigned mentor for this allocation.');
        error.statusCode = 403;
        error.code = 'FORBIDDEN_MENTOR_EVALUATION';
        return next(error);
      }
    } else if (userRole === ROLES.COMPANY) {
      const isHostCompany = allocation.company?.toString() === userId;
      if (!isHostCompany) {
        const error = new Error('Access denied: You are not authorized to evaluate interns for another company.');
        error.statusCode = 403;
        error.code = 'FORBIDDEN_COMPANY_EVALUATION';
        return next(error);
      }
    }

    // Check duplicate evaluation
    const existing = await Evaluation.findOne({
      allocation: allocationId,
      evaluationType,
    });

    if (existing) {
      const error = new Error(
        `A ${evaluationType.replace('_', '-')} evaluation has already been submitted for this internship allocation.`
      );
      error.statusCode = 409;
      error.code = 'DUPLICATE_EVALUATION';
      return next(error);
    }

    // Validate ratings
    if (!ratings || typeof ratings !== 'object') {
      const error = new Error('Evaluation ratings object is required.');
      error.statusCode = 400;
      error.code = 'RATINGS_REQUIRED';
      return next(error);
    }

    const ratingKeys = [
      'technicalSkills',
      'communication',
      'punctualityAndAttendance',
      'initiativeAndLearning',
      'qualityOfWork',
    ];

    for (const key of ratingKeys) {
      const val = ratings[key];
      if (typeof val !== 'number' || val < 1 || val > 5) {
        const error = new Error(`Rating '${key}' must be a numeric score between 1 and 5.`);
        error.statusCode = 400;
        error.code = 'INVALID_RATING_SCORE';
        return next(error);
      }
    }

    if (recommendation && !Object.values(EVALUATION_RECOMMENDATIONS).includes(recommendation)) {
      const error = new Error('Invalid evaluation recommendation choice.');
      error.statusCode = 400;
      error.code = 'INVALID_RECOMMENDATION';
      return next(error);
    }

    req.allocation = allocation;
    next();
  } catch (err) {
    next(err);
  }
};
