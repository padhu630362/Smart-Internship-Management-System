import { ExternalJob, JOB_TYPES } from '../models/ExternalJob.js';
import { UserJobBookmark } from '../models/UserJobBookmark.js';
import { User, ROLES } from '../models/User.js';
import { runJobSyncCycle } from '../services/jobScheduler.js';
import { matchExternalJobWithGemini } from '../services/aiService.js';
import { logger } from '../utils/logger.js';

/**
 * List external job opportunities with rich multi-criteria filters, search, and student AI matching.
 */
export const getExternalJobs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
    const skip = (page - 1) * limit;

    const query = { isActive: true };

    // Search query across title, company, description, or tags
    if (req.query.q && req.query.q.trim()) {
      const regex = new RegExp(req.query.q.trim(), 'i');
      query.$or = [
        { title: regex },
        { company: regex },
        { tags: regex },
        { location: regex },
      ];
    }

    // Role type filter (internship, entry-level, full-time, etc.)
    if (req.query.jobType && Object.values(JOB_TYPES).includes(req.query.jobType)) {
      query.jobType = req.query.jobType;
    }

    // Remote status filter
    if (req.query.isRemote !== undefined && req.query.isRemote !== '') {
      query.isRemote = req.query.isRemote === 'true';
    }

    // Provider source filter
    if (req.query.source && req.query.source.trim()) {
      query.source = new RegExp(req.query.source.trim(), 'i');
    }

    // Tag filter
    if (req.query.tag && req.query.tag.trim()) {
      query.tags = req.query.tag.trim().toLowerCase();
    }

    // If student user requested saved-only or applied-only filter
    if (req.user && (req.query.savedOnly === 'true' || req.query.appliedOnly === 'true')) {
      const interactionQuery = { user: req.user.id };
      if (req.query.savedOnly === 'true') interactionQuery.isBookmarked = true;
      if (req.query.appliedOnly === 'true') interactionQuery.isApplied = true;

      const interactions = await UserJobBookmark.find(interactionQuery).select('externalJob');
      const jobIds = interactions.map((i) => i.externalJob);
      query._id = { $in: jobIds };
    }

    // Fetch jobs and counts
    const [jobs, total, availableSources] = await Promise.all([
      ExternalJob.find(query)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ExternalJob.countDocuments(query),
      ExternalJob.distinct('source', { isActive: true }),
    ]);

    // If user is an authenticated student, attach interactions and AI match scores
    let enrichedJobs = jobs;
    if (req.user && req.user.role === ROLES.STUDENT) {
      const studentUser = await User.findById(req.user.id).lean();
      const studentProfile = {
        name: studentUser.name,
        department: studentUser.profile?.studentDetails?.department || studentUser.profile?.department,
        course: studentUser.profile?.studentDetails?.course,
        skills: studentUser.profile?.studentDetails?.skills || [],
        bio: studentUser.profile?.bio,
        cgpa: studentUser.profile?.studentDetails?.cgpa,
      };

      const jobIds = jobs.map((j) => j._id);
      const bookmarks = await UserJobBookmark.find({
        user: req.user.id,
        externalJob: { $in: jobIds },
      }).lean();

      const bookmarkMap = new Map(bookmarks.map((b) => [b.externalJob.toString(), b]));

      enrichedJobs = await Promise.all(
        jobs.map(async (job) => {
          const interaction = bookmarkMap.get(job._id.toString());
          let matchScore = interaction?.matchScore ?? null;
          let matchRationale = interaction?.matchRationale ?? null;

          // If not calculated yet, compute quick match
          if (matchScore === null && studentProfile.skills.length > 0) {
            const analysis = await matchExternalJobWithGemini({
              studentProfile,
              job,
            });
            matchScore = analysis.matchScore;
            matchRationale = analysis;

            // Cache in UserJobBookmark for swift subsequent page loads
            await UserJobBookmark.findOneAndUpdate(
              { user: req.user.id, externalJob: job._id },
              {
                $set: {
                  matchScore,
                  matchRationale,
                  matchCalculatedAt: new Date(),
                },
              },
              { upsert: true, new: true }
            );
          }

          return {
            ...job,
            isBookmarked: Boolean(interaction?.isBookmarked),
            isApplied: Boolean(interaction?.isApplied),
            appliedAt: interaction?.appliedAt || null,
            matchScore,
            matchRationale,
          };
        })
      );
    }

    res.status(200).json({
      success: true,
      data: {
        jobs: enrichedJobs,
        sources: availableSources,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve a single external job by ID with detailed Gemini AI evaluation breakdown
 */
export const getExternalJobById = async (req, res, next) => {
  try {
    const job = await ExternalJob.findById(req.params.id).lean();

    if (!job) {
      const err = new Error('Job listing not found or is no longer active.');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    let userInteraction = null;
    let aiAnalysis = null;

    if (req.user) {
      userInteraction = await UserJobBookmark.findOne({
        user: req.user.id,
        externalJob: job._id,
      }).lean();

      if (req.user.role === ROLES.STUDENT) {
        const student = await User.findById(req.user.id).lean();
        const studentProfile = {
          name: student.name,
          department: student.profile?.studentDetails?.department || student.profile?.department,
          course: student.profile?.studentDetails?.course,
          skills: student.profile?.studentDetails?.skills || [],
          bio: student.profile?.bio,
          cgpa: student.profile?.studentDetails?.cgpa,
        };

        // If not cached, or requested fresh, compute deep Gemini analysis
        if (!userInteraction?.matchRationale) {
          aiAnalysis = await matchExternalJobWithGemini({
            studentProfile,
            job,
          });

          // Save to interaction
          userInteraction = await UserJobBookmark.findOneAndUpdate(
            { user: req.user.id, externalJob: job._id },
            {
              $set: {
                matchScore: aiAnalysis.matchScore,
                matchRationale: aiAnalysis,
                matchCalculatedAt: new Date(),
              },
            },
            { upsert: true, new: true }
          ).lean();
        } else {
          aiAnalysis = userInteraction.matchRationale;
        }
      }
    }

    res.status(200).json({
      success: true,
      data: {
        job,
        userInteraction: {
          isBookmarked: Boolean(userInteraction?.isBookmarked),
          isApplied: Boolean(userInteraction?.isApplied),
          appliedAt: userInteraction?.appliedAt || null,
          notes: userInteraction?.notes || '',
        },
        aiAnalysis,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle bookmark/saved status for an external job
 */
export const toggleBookmark = async (req, res, next) => {
  try {
    const jobId = req.params.id;
    const job = await ExternalJob.findById(jobId);

    if (!job) {
      const err = new Error('Job listing not found.');
      err.statusCode = 404;
      return next(err);
    }

    let interaction = await UserJobBookmark.findOne({
      user: req.user.id,
      externalJob: jobId,
    });

    const isBookmarked = !interaction?.isBookmarked;

    if (!interaction) {
      interaction = await UserJobBookmark.create({
        user: req.user.id,
        externalJob: jobId,
        isBookmarked: true,
      });
    } else {
      interaction.isBookmarked = isBookmarked;
      await interaction.save();
    }

    res.status(200).json({
      success: true,
      message: isBookmarked ? 'Opportunity saved to your bookmarks.' : 'Opportunity removed from bookmarks.',
      data: {
        jobId,
        isBookmarked,
        isApplied: interaction.isApplied,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle applied status for an external job
 */
export const toggleAppliedStatus = async (req, res, next) => {
  try {
    const jobId = req.params.id;
    const job = await ExternalJob.findById(jobId);

    if (!job) {
      const err = new Error('Job listing not found.');
      err.statusCode = 404;
      return next(err);
    }

    let interaction = await UserJobBookmark.findOne({
      user: req.user.id,
      externalJob: jobId,
    });

    const isApplied = !interaction?.isApplied;
    const appliedAt = isApplied ? new Date() : null;

    if (!interaction) {
      interaction = await UserJobBookmark.create({
        user: req.user.id,
        externalJob: jobId,
        isApplied: true,
        appliedAt,
      });
    } else {
      interaction.isApplied = isApplied;
      interaction.appliedAt = appliedAt;
      await interaction.save();
    }

    res.status(200).json({
      success: true,
      message: isApplied ? 'Opportunity marked as applied.' : 'Opportunity unmarked as applied.',
      data: {
        jobId,
        isApplied,
        appliedAt,
        isBookmarked: interaction.isBookmarked,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update personal notes for an opportunity
 */
export const updateJobNotes = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const jobId = req.params.id;

    const interaction = await UserJobBookmark.findOneAndUpdate(
      { user: req.user.id, externalJob: jobId },
      { $set: { notes: (notes || '').slice(0, 1000) } },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Job notes updated successfully.',
      data: { notes: interaction.notes },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve saved and applied opportunities for the logged-in student
 */
export const getMyInteractions = async (req, res, next) => {
  try {
    const interactions = await UserJobBookmark.find({
      user: req.user.id,
      $or: [{ isBookmarked: true }, { isApplied: true }],
    })
      .populate('externalJob')
      .sort({ updatedAt: -1 })
      .lean();

    const bookmarked = [];
    const applied = [];

    for (const item of interactions) {
      if (!item.externalJob) continue;
      const combined = {
        ...item.externalJob,
        isBookmarked: item.isBookmarked,
        isApplied: item.isApplied,
        appliedAt: item.appliedAt,
        notes: item.notes,
        matchScore: item.matchScore,
        matchRationale: item.matchRationale,
      };

      if (item.isBookmarked) bookmarked.push(combined);
      if (item.isApplied) applied.push(combined);
    }

    res.status(200).json({
      success: true,
      data: {
        bookmarked,
        applied,
        totalBookmarked: bookmarked.length,
        totalApplied: applied.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Returns top AI-recommended opportunities ranked by match score for student
 */
export const getPersonalizedRecommendations = async (req, res, next) => {
  try {
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 6));
    const studentUser = await User.findById(req.user.id).lean();

    const studentProfile = {
      name: studentUser.name,
      department: studentUser.profile?.studentDetails?.department || studentUser.profile?.department,
      course: studentUser.profile?.studentDetails?.course,
      skills: studentUser.profile?.studentDetails?.skills || [],
      bio: studentUser.profile?.bio,
      cgpa: studentUser.profile?.studentDetails?.cgpa,
    };

    // Candidate jobs (prefer internships and entry-level roles)
    const recentJobs = await ExternalJob.find({ isActive: true })
      .sort({ publishedAt: -1 })
      .limit(40)
      .lean();

    const jobIds = recentJobs.map((j) => j._id);
    const bookmarks = await UserJobBookmark.find({
      user: req.user.id,
      externalJob: { $in: jobIds },
    }).lean();

    const bookmarkMap = new Map(bookmarks.map((b) => [b.externalJob.toString(), b]));

    const evaluatedJobs = await Promise.all(
      recentJobs.map(async (job) => {
        const interaction = bookmarkMap.get(job._id.toString());
        let matchScore = interaction?.matchScore;
        let matchRationale = interaction?.matchRationale;

        if (matchScore === undefined || matchScore === null) {
          const analysis = await matchExternalJobWithGemini({
            studentProfile,
            job,
          });
          matchScore = analysis.matchScore;
          matchRationale = analysis;

          await UserJobBookmark.findOneAndUpdate(
            { user: req.user.id, externalJob: job._id },
            {
              $set: {
                matchScore,
                matchRationale,
                matchCalculatedAt: new Date(),
              },
            },
            { upsert: true, new: true }
          );
        }

        return {
          ...job,
          isBookmarked: Boolean(interaction?.isBookmarked),
          isApplied: Boolean(interaction?.isApplied),
          matchScore,
          matchRationale,
        };
      })
    );

    // Sort by highest match score first
    evaluatedJobs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    res.status(200).json({
      success: true,
      data: {
        recommendations: evaluatedJobs.slice(0, limit),
        studentSkills: studentProfile.skills,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * On-demand manual sync trigger
 */
export const syncExternalJobs = async (req, res, next) => {
  try {
    const notify = req.body?.notify !== false;
    const result = await runJobSyncCycle({ notify });

    res.status(200).json({
      success: true,
      message: 'External job feeds sync cycle completed.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getExternalJobs,
  getExternalJobById,
  toggleBookmark,
  toggleAppliedStatus,
  updateJobNotes,
  getMyInteractions,
  getPersonalizedRecommendations,
  syncExternalJobs,
};

