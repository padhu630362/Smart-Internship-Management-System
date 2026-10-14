import mongoose from 'mongoose';
import { User, ROLES } from '../models/User.js';
import { Internship, INTERNSHIP_STATUSES } from '../models/Internship.js';
import { Application, APPLICATION_STATUSES } from '../models/Application.js';
import { Allocation, ALLOCATION_STATUSES } from '../models/Allocation.js';
import { Attendance, ATTENDANCE_STATUSES } from '../models/Attendance.js';
import { Task, TASK_STATUSES } from '../models/Task.js';
import { Evaluation } from '../models/Evaluation.js';

/**
 * Dynamically computes role-specific dashboard metrics from actual MongoDB records
 */
export const getDashboardAnalytics = async (req, res, next) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;

    if (userRole === ROLES.ADMIN || userRole === ROLES.COORDINATOR) {
      // 1. Admin & Coordinator High-Level Aggregations
      const [
        studentsCount,
        companiesCount,
        mentorsCount,
        coordinatorsCount,
        internshipsStats,
        applicationsByStatus,
        allocationsStats,
        attendanceStats,
        tasksStats,
        evaluationsStats,
        departmentBreakdown,
        recentApplications,
        recentAllocations,
        recentEvaluations,
      ] = await Promise.all([
        User.countDocuments({ role: ROLES.STUDENT }),
        User.countDocuments({ role: ROLES.COMPANY }),
        User.countDocuments({ role: ROLES.MENTOR }),
        User.countDocuments({ role: ROLES.COORDINATOR }),

        // Internship counts by status
        Internship.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),

        // Applications by status
        Application.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),

        // Allocations by status
        Allocation.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),

        // Attendance aggregates
        Attendance.aggregate([
          {
            $group: {
              _id: null,
              totalRecords: { $sum: 1 },
              presentCount: {
                $sum: {
                  $cond: [
                    { $in: ['$status', [ATTENDANCE_STATUSES.PRESENT, ATTENDANCE_STATUSES.REMOTE]] },
                    1,
                    0,
                  ],
                },
              },
              absentCount: {
                $sum: {
                  $cond: [{ $eq: ['$status', ATTENDANCE_STATUSES.ABSENT] }, 1, 0],
                },
              },
            },
          },
        ]),

        // Tasks aggregates
        Task.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ]),

        // Evaluations metrics
        Evaluation.aggregate([
          {
            $group: {
              _id: null,
              totalEvaluations: { $sum: 1 },
              avgRating: { $avg: '$ratings.overallRating' },
              midTermCount: {
                $sum: { $cond: [{ $eq: ['$evaluationType', 'mid_term'] }, 1, 0] },
              },
              finalCount: {
                $sum: { $cond: [{ $eq: ['$evaluationType', 'final'] }, 1, 0] },
              },
            },
          },
        ]),

        // Department breakdown of students
        User.aggregate([
          { $match: { role: ROLES.STUDENT } },
          {
            $group: {
              _id: { $ifNull: ['$profile.studentDetails.department', 'General / Other'] },
              studentCount: { $sum: 1 },
            },
          },
          { $sort: { studentCount: -1 } },
          { $limit: 10 },
        ]),

        // Recent Activity
        Application.find()
          .populate('student', 'name email')
          .populate('internship', 'title companyName')
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),

        Allocation.find()
          .populate('student', 'name email profile')
          .populate('internship', 'title')
          .populate('company', 'name')
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),

        Evaluation.find()
          .populate('student', 'name')
          .populate('evaluator', 'name role')
          .populate('internship', 'title')
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
      ]);

      // Formatted summaries
      const opportunitiesSummary = {
        total: internshipsStats.reduce((acc, curr) => acc + curr.count, 0),
        published: internshipsStats.find((s) => s._id === 'published')?.count || 0,
        draft: internshipsStats.find((s) => s._id === 'draft')?.count || 0,
        closed: internshipsStats.find((s) => s._id === 'closed')?.count || 0,
        archived: internshipsStats.find((s) => s._id === 'archived')?.count || 0,
      };

      const applicationStatusMap = {};
      Object.values(APPLICATION_STATUSES).forEach((st) => {
        applicationStatusMap[st] = 0;
      });
      applicationsByStatus.forEach((s) => {
        applicationStatusMap[s._id] = s.count;
      });
      const totalApplications = applicationsByStatus.reduce((acc, curr) => acc + curr.count, 0);

      const allocationStatusMap = {};
      Object.values(ALLOCATION_STATUSES).forEach((st) => {
        allocationStatusMap[st] = 0;
      });
      allocationsStats.forEach((s) => {
        allocationStatusMap[s._id] = s.count;
      });
      const totalAllocations = allocationsStats.reduce((acc, curr) => acc + curr.count, 0);
      const completedAllocations = allocationStatusMap[ALLOCATION_STATUSES.COMPLETED] || 0;
      const activeAllocations = allocationStatusMap[ALLOCATION_STATUSES.ACTIVE] || 0;
      const completionRate =
        totalAllocations > 0 ? Math.round((completedAllocations / totalAllocations) * 100) : 0;

      const attRecord = attendanceStats[0] || { totalRecords: 0, presentCount: 0, absentCount: 0 };
      const attendanceRate =
        attRecord.totalRecords > 0
          ? Math.round((attRecord.presentCount / attRecord.totalRecords) * 100)
          : 0;

      const taskStatusMap = {};
      Object.values(TASK_STATUSES).forEach((st) => {
        taskStatusMap[st] = 0;
      });
      tasksStats.forEach((s) => {
        taskStatusMap[s._id] = s.count;
      });
      const totalTasks = tasksStats.reduce((acc, curr) => acc + curr.count, 0);
      const completedTasks = taskStatusMap[TASK_STATUSES.COMPLETED] || 0;
      const taskCompletionRate =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      const evalRecord = evaluationsStats[0] || {
        totalEvaluations: 0,
        avgRating: 0,
        midTermCount: 0,
        finalCount: 0,
      };

      return res.status(200).json({
        success: true,
        data: {
          role: userRole,
          users: {
            totalStudents: studentsCount,
            totalCompanies: companiesCount,
            totalMentors: mentorsCount,
            totalCoordinators: coordinatorsCount,
          },
          opportunities: opportunitiesSummary,
          applications: {
            total: totalApplications,
            byStatus: applicationStatusMap,
          },
          allocations: {
            total: totalAllocations,
            active: activeAllocations,
            completed: completedAllocations,
            terminated: allocationStatusMap[ALLOCATION_STATUSES.TERMINATED] || 0,
            completionRate,
          },
          attendance: {
            totalRecords: attRecord.totalRecords,
            presentDays: attRecord.presentCount,
            absentDays: attRecord.absentCount,
            overallAttendanceRate: attendanceRate,
          },
          tasks: {
            total: totalTasks,
            completed: completedTasks,
            inProgress: taskStatusMap[TASK_STATUSES.IN_PROGRESS] || 0,
            submitted: taskStatusMap[TASK_STATUSES.SUBMITTED] || 0,
            pending: taskStatusMap[TASK_STATUSES.PENDING] || 0,
            completionRate: taskCompletionRate,
          },
          evaluations: {
            total: evalRecord.totalEvaluations,
            averageRating: Math.round((evalRecord.avgRating || 0) * 10) / 10,
            midTermCount: evalRecord.midTermCount,
            finalCount: evalRecord.finalCount,
          },
          departmentBreakdown: departmentBreakdown.map((d) => ({
            department: d._id,
            count: d.studentCount,
          })),
          recentActivity: {
            applications: recentApplications,
            allocations: recentAllocations,
            evaluations: recentEvaluations,
          },
        },
      });
    }

    if (userRole === ROLES.STUDENT) {
      // 2. Student Personalized Dashboard
      const now = new Date();

      const [
        availableOpportunitiesCount,
        myApplications,
        activeAllocation,
        attendanceStats,
        myTasks,
        upcomingTasks,
        myEvaluations,
      ] = await Promise.all([
        Internship.countDocuments({
          status: INTERNSHIP_STATUSES.PUBLISHED,
          applicationDeadline: { $gte: now },
        }),

        Application.find({ student: userId })
          .populate('internship', 'title companyName location workMode stipend')
          .sort({ createdAt: -1 })
          .lean(),

        Allocation.findOne({ student: userId, status: ALLOCATION_STATUSES.ACTIVE })
          .populate('internship', 'title companyName location duration workMode')
          .populate('company', 'name email profile')
          .populate('mentor', 'name email profile')
          .lean(),

        Attendance.aggregate([
          { $match: { student: new mongoose.Types.ObjectId(userId) } },
          {
            $group: {
              _id: null,
              totalRecords: { $sum: 1 },
              presentCount: {
                $sum: {
                  $cond: [
                    { $in: ['$status', [ATTENDANCE_STATUSES.PRESENT, ATTENDANCE_STATUSES.REMOTE]] },
                    1,
                    0,
                  ],
                },
              },
              remoteCount: {
                $sum: { $cond: [{ $eq: ['$status', ATTENDANCE_STATUSES.REMOTE] }, 1, 0] },
              },
              absentCount: {
                $sum: { $cond: [{ $eq: ['$status', ATTENDANCE_STATUSES.ABSENT] }, 1, 0] },
              },
            },
          },
        ]),

        Task.find({ assignedTo: userId }).lean(),

        Task.find({
          assignedTo: userId,
          status: { $ne: TASK_STATUSES.COMPLETED },
        })
          .sort({ dueDate: 1 })
          .limit(5)
          .lean(),

        Evaluation.find({ student: userId })
          .populate('evaluator', 'name role')
          .populate('internship', 'title')
          .sort({ createdAt: -1 })
          .lean(),
      ]);

      const appStatusMap = {};
      Object.values(APPLICATION_STATUSES).forEach((st) => (appStatusMap[st] = 0));
      myApplications.forEach((a) => {
        appStatusMap[a.status] = (appStatusMap[a.status] || 0) + 1;
      });

      const att = attendanceStats[0] || {
        totalRecords: 0,
        presentCount: 0,
        remoteCount: 0,
        absentCount: 0,
      };
      const attendanceRate =
        att.totalRecords > 0 ? Math.round((att.presentCount / att.totalRecords) * 100) : 0;

      const taskStats = {
        total: myTasks.length,
        completed: myTasks.filter((t) => t.status === TASK_STATUSES.COMPLETED).length,
        inProgress: myTasks.filter((t) => t.status === TASK_STATUSES.IN_PROGRESS).length,
        submitted: myTasks.filter((t) => t.status === TASK_STATUSES.SUBMITTED).length,
        pending: myTasks.filter((t) => t.status === TASK_STATUSES.PENDING).length,
        overdue: myTasks.filter(
          (t) => t.status !== TASK_STATUSES.COMPLETED && new Date(t.dueDate) < now
        ).length,
      };

      return res.status(200).json({
        success: true,
        data: {
          role: userRole,
          availableOpportunities: availableOpportunitiesCount,
          applications: {
            total: myApplications.length,
            byStatus: appStatusMap,
            recent: myApplications.slice(0, 5),
          },
          currentInternship: activeAllocation || null,
          attendance: {
            totalDaysLogged: att.totalRecords,
            presentDays: att.presentCount,
            remoteDays: att.remoteCount,
            absentDays: att.absentCount,
            attendanceRate,
          },
          tasks: {
            ...taskStats,
            upcoming: upcomingTasks,
          },
          evaluations: myEvaluations,
        },
      });
    }

    if (userRole === ROLES.COMPANY || userRole === ROLES.MENTOR) {
      // 3. Mentor & Host Employer Dashboard
      const isCompany = userRole === ROLES.COMPANY;

      // Filter query for allocations
      const allocationFilter = isCompany ? { company: userId } : { mentor: userId };

      const [
        myOpportunities,
        managedAllocations,
        pendingTasksToReview,
        tasksAssignedByMe,
        evaluationsSubmitted,
      ] = await Promise.all([
        isCompany
          ? Internship.find({ company: userId }).lean()
          : Internship.find().lean(), // Mentors view associated internships

        Allocation.find(allocationFilter)
          .populate('student', 'name email profile')
          .populate('internship', 'title location workMode')
          .populate('mentor', 'name email')
          .sort({ createdAt: -1 })
          .lean(),

        Task.find({
          status: TASK_STATUSES.SUBMITTED,
          ...(isCompany ? {} : { assignedBy: userId }),
        })
          .populate('assignedTo', 'name email profile')
          .populate('internship', 'title')
          .sort({ updatedAt: -1 })
          .limit(10)
          .lean(),

        Task.find(isCompany ? {} : { assignedBy: userId }).lean(),

        Evaluation.find({ evaluator: userId })
          .populate('student', 'name email')
          .populate('internship', 'title')
          .sort({ createdAt: -1 })
          .lean(),
      ]);

      const opportunityIds = myOpportunities.map((o) => o._id);

      // Total applicants to company's internships
      const applicantsByStatus = await Application.aggregate([
        { $match: { internship: { $in: opportunityIds } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);

      const applicantStatusMap = {};
      Object.values(APPLICATION_STATUSES).forEach((st) => (applicantStatusMap[st] = 0));
      applicantsByStatus.forEach((s) => (applicantStatusMap[s._id] = s.count));
      const totalApplicants = applicantsByStatus.reduce((acc, curr) => acc + curr.count, 0);

      const activeInterns = managedAllocations.filter(
        (a) => a.status === ALLOCATION_STATUSES.ACTIVE
      );

      // Pending evaluations needed: active allocations that haven't received final evaluation
      const evaluatedAllocIds = new Set(
        evaluationsSubmitted.filter((e) => e.evaluationType === 'final').map((e) => e.allocation.toString())
      );
      const pendingFinalEvaluationsCount = activeInterns.filter(
        (a) => !evaluatedAllocIds.has(a._id.toString())
      ).length;

      const taskStats = {
        total: tasksAssignedByMe.length,
        completed: tasksAssignedByMe.filter((t) => t.status === TASK_STATUSES.COMPLETED).length,
        submittedPendingReview: pendingTasksToReview.length,
        inProgress: tasksAssignedByMe.filter((t) => t.status === TASK_STATUSES.IN_PROGRESS).length,
        overdue: tasksAssignedByMe.filter(
          (t) => t.status !== TASK_STATUSES.COMPLETED && new Date(t.dueDate) < new Date()
        ).length,
      };

      const allocationIds = managedAllocations.map((a) => a._id);
      const pendingAttendanceRecords = await Attendance.find({
        allocation: { $in: allocationIds },
        reviewStatus: 'submitted',
      })
        .populate('student', 'name email profile')
        .sort({ date: -1 })
        .limit(10)
        .lean();

      return res.status(200).json({
        success: true,
        data: {
          role: userRole,
          opportunities: {
            total: myOpportunities.length,
            published: myOpportunities.filter((o) => o.status === INTERNSHIP_STATUSES.PUBLISHED).length,
            list: myOpportunities.slice(0, 5),
          },
          applicants: {
            total: totalApplicants,
            byStatus: applicantStatusMap,
          },
          assignedInterns: {
            total: managedAllocations.length,
            active: activeInterns.length,
            list: managedAllocations,
          },
          attendance: {
            pendingReviewsCount: pendingAttendanceRecords.length,
            pendingList: pendingAttendanceRecords,
          },
          tasks: {
            ...taskStats,
            pendingReviews: pendingTasksToReview,
          },
          evaluations: {
            submittedCount: evaluationsSubmitted.length,
            pendingEvaluationsCount: pendingFinalEvaluationsCount,
            list: evaluationsSubmitted,
          },
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        role: userRole,
        message: 'Dashboard initialized.',
      },
    });
  } catch (err) {
    next(err);
  }
};
