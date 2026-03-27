import express from 'express';
import * as authController from './controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { loginSchema, signupSchema } from './validation.js';
import { protect } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.post('/signup', validate(signupSchema), authController.customerSignup);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOTP);
router.post('/reset-password', authController.resetPassword);
router.get('/me', protect, authController.getMe);

export default router;
