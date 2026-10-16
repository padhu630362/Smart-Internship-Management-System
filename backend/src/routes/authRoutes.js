import { Router } from 'express';
import {
  register,
  login,
  verifyTwoFactor,
  resendTwoFactorCode,
  getMe,
  logout,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  googleLogin,
} from '../controllers/authController.js';
import { authenticateToken, requireRoles } from '../middlewares/auth.js';
import {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateVerifyResetCode,
  validateResetPassword,
} from '../middlewares/validateAuth.js';
import { authRateLimiter } from '../middlewares/rateLimiter.js';
import { ROLES } from '../models/User.js';

const router = Router();

// Public Authentication Endpoints
router.post('/register', authRateLimiter, validateRegister, register);
router.post('/login', authRateLimiter, validateLogin, login);
router.post('/login-verify-2fa', authRateLimiter, verifyTwoFactor);
router.post('/resend-2fa', authRateLimiter, resendTwoFactorCode);
router.post('/google', authRateLimiter, googleLogin);
router.post('/forgot-password', authRateLimiter, validateForgotPassword, forgotPassword);
router.post('/verify-reset-code', authRateLimiter, validateVerifyResetCode, verifyResetCode);
router.post('/reset-password', authRateLimiter, validateResetPassword, resetPassword);

// Authenticated Endpoints
router.get('/me', authenticateToken, getMe);
router.post('/logout', authenticateToken, logout);

// RBAC Role Verification Test Endpoints
router.get('/admin-access-test', authenticateToken, requireRoles(ROLES.ADMIN), (req, res) => {
  res.status(200).json({ success: true, message: 'Admin privileges verified.', user: req.user });
});

router.get(
  '/coordinator-access-test',
  authenticateToken,
  requireRoles(ROLES.COORDINATOR, ROLES.ADMIN),
  (req, res) => {
    res.status(200).json({ success: true, message: 'Coordinator privileges verified.', user: req.user });
  }
);

router.get(
  '/company-access-test',
  authenticateToken,
  requireRoles(ROLES.COMPANY, ROLES.MENTOR, ROLES.ADMIN),
  (req, res) => {
    res.status(200).json({ success: true, message: 'Company/Mentor privileges verified.', user: req.user });
  }
);

router.get(
  '/student-access-test',
  authenticateToken,
  requireRoles(ROLES.STUDENT, ROLES.ADMIN),
  (req, res) => {
    res.status(200).json({ success: true, message: 'Student privileges verified.', user: req.user });
  }
);

export default router;
