import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middlewares/auth.js';
import { ROLES } from '../models/User.js';
import { uploadResumeFile, uploadAvatarFile } from '../utils/fileUpload.js';
import { uploadRateLimiter } from '../middlewares/rateLimiter.js';
import {
  validateUpdateProfile,
  validateAdminCreateUser,
  validateAdminUpdateUser,
} from '../middlewares/validateUser.js';
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  downloadAvatar,
  uploadResume,
  downloadResume,
  deleteResume,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus,
  deleteUser,
} from '../controllers/userController.js';

const router = Router();

// ==========================================
// User Self-Profile Management Endpoints
// ==========================================
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, validateUpdateProfile, updateProfile);

// Profile Picture (Avatar) Upload, Download, and Delete
router.post(
  '/profile/avatar',
  authenticateToken,
  uploadRateLimiter,
  uploadAvatarFile.single('avatar'),
  uploadAvatar
);
router.delete('/profile/avatar', authenticateToken, deleteAvatar);
router.get('/profile/avatar/:filename', downloadAvatar);

// Student Resume Upload, Download, and Delete
router.post(
  '/profile/resume',
  authenticateToken,
  requireRoles(ROLES.STUDENT),
  uploadRateLimiter,
  uploadResumeFile.single('resume'),
  uploadResume
);
router.get('/profile/resume/:filename', authenticateToken, downloadResume);
router.delete('/profile/resume', authenticateToken, requireRoles(ROLES.STUDENT), deleteResume);

// ==========================================
// Admin User Management Endpoints
// ==========================================
router.get('/', authenticateToken, requireRoles(ROLES.ADMIN), getUsers);
router.post('/', authenticateToken, requireRoles(ROLES.ADMIN), validateAdminCreateUser, createUser);
router.get('/:id', authenticateToken, requireRoles(ROLES.ADMIN), getUserById);
router.put('/:id', authenticateToken, requireRoles(ROLES.ADMIN), validateAdminUpdateUser, updateUser);
router.patch('/:id/status', authenticateToken, requireRoles(ROLES.ADMIN), validateAdminUpdateUser, updateUserStatus);
router.delete('/:id', authenticateToken, requireRoles(ROLES.ADMIN), deleteUser);

export default router;
