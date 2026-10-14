import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import internshipRoutes from './internshipRoutes.js';
import applicationRoutes from './applicationRoutes.js';
import allocationRoutes from './allocationRoutes.js';
import attendanceRoutes from './attendanceRoutes.js';
import taskRoutes from './taskRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import chatRoutes from './chatRoutes.js';
import evaluationRoutes from './evaluationRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import reportRoutes from './reportRoutes.js';
import auditLogRoutes from './auditLogRoutes.js';

const router = Router();

// Root API information endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Smart Internship Management System API is online.',
    documentation: '/docs',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      internships: '/api/internships',
      applications: '/api/applications',
      allocations: '/api/allocations',
      attendance: '/api/attendance',
      tasks: '/api/tasks',
      notifications: '/api/notifications',
      chat: '/api/chat',
      evaluations: '/api/evaluations',
      analytics: '/api/analytics',
      reports: '/api/reports',
      auditLogs: '/api/audit-logs',
    },
  });
});

// Mount domain routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/internships', internshipRoutes);
router.use('/applications', applicationRoutes);
router.use('/allocations', allocationRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/tasks', taskRoutes);
router.use('/notifications', notificationRoutes);
router.use('/chat', chatRoutes);
router.use('/evaluations', evaluationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/reports', reportRoutes);
router.use('/audit-logs', auditLogRoutes);

export default router;
